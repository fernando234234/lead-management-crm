/**
 * Execute the lead import:
 * 1. Update 38 unassigned leads with commercial assignments + META campaign
 * 2. Reassign 3 leads from Marilena to Silvana
 * 3. Import 1 new lead (Flavio Tarabù)
 * 
 * All leads get linked to their course's existing META campaign
 */

const { PrismaClient } = require('@prisma/client');
const importData = require('./import-leads.json');

const prisma = new PrismaClient();

async function executeImport() {
  console.log('=== EXECUTING LEAD IMPORT/UPDATE ===\n');

  // Get all users (commercials)
  const users = await prisma.user.findMany({
    where: { role: 'COMMERCIAL' },
    select: { id: true, name: true, username: true }
  });
  const userMap = new Map();
  users.forEach(u => {
    userMap.set(u.name.toLowerCase().trim(), u.id);
    userMap.set(u.username.toLowerCase().trim(), u.id);
  });

  // Get all campaigns (for linking to META campaigns by course name)
  const campaigns = await prisma.campaign.findMany({
    where: { platform: 'META' },
    select: { id: true, name: true }
  });
  // Map course name -> campaign ID (e.g., "Masterclass Graphic Web Design" -> campaign ID)
  const campaignMap = new Map();
  campaigns.forEach(c => {
    // Extract course name from campaign name (remove " - META" suffix)
    const courseName = c.name.replace(' - META', '').toLowerCase().trim();
    campaignMap.set(courseName, c.id);
  });

  // Get all existing leads for matching
  const existingLeads = await prisma.lead.findMany({
    select: { 
      id: true,
      name: true, 
      assignedToId: true,
      campaignId: true,
      course: { select: { name: true } },
      assignedTo: { select: { name: true } }
    }
  });

  // Create lookup by name + course
  const existingByNameCourse = new Map();
  existingLeads.forEach(lead => {
    const key = `${lead.name.toLowerCase().trim()}|${(lead.course?.name || '').toLowerCase().trim()}`;
    if (!existingByNameCourse.has(key)) {
      existingByNameCourse.set(key, []);
    }
    existingByNameCourse.get(key).push(lead);
  });

  // Track results
  const results = {
    updated: [],
    reassigned: [],
    imported: [],
    skipped: [],
    errors: []
  };

  // Process each lead from import
  for (const lead of importData.leads) {
    const leadNameLower = lead.name.toLowerCase().trim();
    const courseNameLower = (lead.courseName || '').toLowerCase().trim();
    const key = `${leadNameLower}|${courseNameLower}`;
    
    // Find commercial ID
    const commercialId = userMap.get((lead.assignedToName || '').toLowerCase().trim());
    
    // Find META campaign for this course
    let campaignId = campaignMap.get(courseNameLower);
    // Try partial match if exact not found
    if (!campaignId) {
      for (const [campCourse, campId] of campaignMap.entries()) {
        if (campCourse.includes(courseNameLower) || courseNameLower.includes(campCourse)) {
          campaignId = campId;
          break;
        }
      }
    }

    // Check if lead exists
    const existing = existingByNameCourse.get(key) || [];
    
    // Find unassigned or differently-assigned match
    const unassignedMatch = existing.find(e => !e.assignedToId);
    const differentCommercialMatch = existing.find(e => 
      e.assignedToId && 
      e.assignedTo?.name?.toLowerCase() !== (lead.assignedToName || '').toLowerCase()
    );
    const exactMatch = existing.find(e => 
      e.assignedTo?.name?.toLowerCase() === (lead.assignedToName || '').toLowerCase()
    );

    try {
      if (exactMatch) {
        // Exact duplicate - skip but ensure campaign is set
        if (!exactMatch.campaignId && campaignId) {
          await prisma.lead.update({
            where: { id: exactMatch.id },
            data: { campaignId }
          });
          results.skipped.push({
            name: lead.name,
            reason: 'Exact duplicate - updated campaign only',
            campaignId
          });
        } else {
          results.skipped.push({
            name: lead.name,
            reason: 'Exact duplicate - already has campaign'
          });
        }
      } else if (unassignedMatch) {
        // Update unassigned lead
        await prisma.lead.update({
          where: { id: unassignedMatch.id },
          data: { 
            assignedToId: commercialId,
            campaignId: campaignId || unassignedMatch.campaignId
          }
        });
        results.updated.push({
          name: lead.name,
          commercial: lead.assignedToName,
          leadId: unassignedMatch.id
        });
      } else if (differentCommercialMatch) {
        // Reassign lead
        const oldCommercial = differentCommercialMatch.assignedTo?.name;
        await prisma.lead.update({
          where: { id: differentCommercialMatch.id },
          data: { 
            assignedToId: commercialId,
            campaignId: campaignId || differentCommercialMatch.campaignId
          }
        });
        results.reassigned.push({
          name: lead.name,
          from: oldCommercial,
          to: lead.assignedToName,
          leadId: differentCommercialMatch.id
        });
      } else {
        // New lead - import it
        // First find or create course
        let course = await prisma.course.findFirst({
          where: { name: { equals: lead.courseName, mode: 'insensitive' } }
        });
        
        if (!course && lead.courseName) {
          // Try partial match
          course = await prisma.course.findFirst({
            where: { 
              OR: [
                { name: { contains: lead.courseName, mode: 'insensitive' } },
                { name: { startsWith: lead.courseName.split(' ')[0], mode: 'insensitive' } }
              ]
            }
          });
        }
        
        if (!course) {
          results.errors.push({
            name: lead.name,
            error: `Course not found: ${lead.courseName}`
          });
          continue;
        }

        const newLead = await prisma.lead.create({
          data: {
            name: lead.name,
            courseId: course.id,
            assignedToId: commercialId,
            campaignId: campaignId,
            status: lead.status || 'NUOVO',
            contacted: lead.status === 'CONTATTATO' || lead.status === 'IN_TRATTATIVA' || lead.status === 'ISCRITTO',
            enrolled: lead.status === 'ISCRITTO',
            source: 'LEGACY_IMPORT'
          }
        });
        results.imported.push({
          name: lead.name,
          commercial: lead.assignedToName,
          course: lead.courseName,
          leadId: newLead.id
        });
      }
    } catch (error) {
      results.errors.push({
        name: lead.name,
        error: error.message
      });
    }
  }

  // Print results
  console.log('=== RESULTS ===\n');
  
  console.log(`✅ UPDATED (assigned commercial): ${results.updated.length}`);
  results.updated.forEach(r => {
    console.log(`   - ${r.name} → ${r.commercial}`);
  });

  console.log(`\n🔄 REASSIGNED: ${results.reassigned.length}`);
  results.reassigned.forEach(r => {
    console.log(`   - ${r.name}: ${r.from} → ${r.to}`);
  });

  console.log(`\n🆕 IMPORTED: ${results.imported.length}`);
  results.imported.forEach(r => {
    console.log(`   - ${r.name} (${r.course}) → ${r.commercial}`);
  });

  console.log(`\n⏭️  SKIPPED (duplicates): ${results.skipped.length}`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ ERRORS: ${results.errors.length}`);
    results.errors.forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Updated:    ${results.updated.length}`);
  console.log(`Reassigned: ${results.reassigned.length}`);
  console.log(`Imported:   ${results.imported.length}`);
  console.log(`Skipped:    ${results.skipped.length}`);
  console.log(`Errors:     ${results.errors.length}`);
  console.log(`TOTAL:      ${results.updated.length + results.reassigned.length + results.imported.length + results.skipped.length + results.errors.length}`);

  await prisma.$disconnect();
}

executeImport().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
