import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCommercials() {
  console.log("=== COMMERCIAL ASSIGNMENT CHECK ===\n");

  // Get all valid commercials
  const commercials = await prisma.user.findMany({
    where: { role: 'COMMERCIAL' },
    select: { id: true, name: true, email: true }
  });
  
  console.log("✓ Valid Commercials in the system:");
  commercials.forEach(c => console.log(`  - ${c.name || 'No name'} (${c.email}) - ID: ${c.id}`));
  
  const validCommercialIds = commercials.map(c => c.id);

  // Get today's leads
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const recentLeads = await prisma.lead.findMany({
    where: { createdAt: { gte: today } },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      course: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n📅 Leads created today: ${recentLeads.length}\n`);

  // Check assignments
  const notAssigned: typeof recentLeads = [];
  const assignedToNonCommercial: typeof recentLeads = [];
  const assignedToInvalidUser: typeof recentLeads = [];
  const assignmentsByCommercial: Record<string, typeof recentLeads> = {};

  for (const lead of recentLeads) {
    if (!lead.assignedToId) {
      notAssigned.push(lead);
    } else if (!lead.assignedTo) {
      // Has assignedToId but user doesn't exist
      assignedToInvalidUser.push(lead);
    } else if (lead.assignedTo.role !== 'COMMERCIAL') {
      // Assigned to non-commercial user
      assignedToNonCommercial.push(lead);
    } else {
      // Valid assignment
      const name = lead.assignedTo.name || lead.assignedTo.email || 'Unknown';
      if (!assignmentsByCommercial[name]) assignmentsByCommercial[name] = [];
      assignmentsByCommercial[name].push(lead);
    }
  }

  console.log("=== ASSIGNMENT BREAKDOWN ===\n");
  
  console.log(`✅ Assigned to valid commercials: ${recentLeads.length - notAssigned.length - assignedToNonCommercial.length - assignedToInvalidUser.length}`);
  for (const [name, leads] of Object.entries(assignmentsByCommercial).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   ${name}: ${leads.length} leads`);
  }

  console.log(`\n⚠️  Not assigned (no commercial): ${notAssigned.length}`);
  if (notAssigned.length > 0 && notAssigned.length <= 50) {
    notAssigned.forEach(l => console.log(`   - ${l.name} (${l.course?.name})`));
  }

  console.log(`\n❌ Assigned to NON-COMMERCIAL user: ${assignedToNonCommercial.length}`);
  if (assignedToNonCommercial.length > 0) {
    assignedToNonCommercial.forEach(l => 
      console.log(`   - ${l.name} → ${l.assignedTo?.name} (role: ${l.assignedTo?.role})`)
    );
  }

  console.log(`\n❌ Assigned to INVALID/DELETED user: ${assignedToInvalidUser.length}`);
  if (assignedToInvalidUser.length > 0) {
    assignedToInvalidUser.forEach(l => 
      console.log(`   - ${l.name} → assignedToId: ${l.assignedToId} (user not found!)`)
    );
  }

  // Check for weird commercial names that might have been imported wrong
  console.log("\n=== CHECKING FOR WEIRD ASSIGNMENT PATTERNS ===\n");
  
  // Get all unique assignedToId values from today's leads
  const assignedIds = new Set(recentLeads.filter(l => l.assignedToId).map(l => l.assignedToId));
  console.log(`Unique assignedToId values used today: ${assignedIds.size}`);
  
  // Check if any leads have assignedToId that looks like a name instead of an ID
  const weirdIds = recentLeads.filter(l => {
    if (!l.assignedToId) return false;
    // CUID IDs start with 'c' and are 25+ chars
    // If it doesn't match this pattern, it might be wrong
    const isCuid = /^c[a-z0-9]{24,}$/.test(l.assignedToId);
    return !isCuid;
  });
  
  if (weirdIds.length > 0) {
    console.log(`\n❌ Leads with MALFORMED assignedToId (not a valid CUID):`);
    weirdIds.forEach(l => console.log(`   - ${l.name} → assignedToId: "${l.assignedToId}"`));
  } else {
    console.log("✓ All assignedToId values are valid CUIDs");
  }

  // Also check if Excel might have imported commercial NAMES instead of IDs
  // by looking at the raw lead data
  console.log("\n=== SAMPLE OF TODAY'S RAW DATA ===\n");
  const sample = recentLeads.slice(0, 10);
  for (const lead of sample) {
    console.log(`${lead.name}:`);
    console.log(`  assignedToId: ${lead.assignedToId || '(null)'}`);
    console.log(`  assignedTo.name: ${lead.assignedTo?.name || '(null)'}`);
    console.log(`  course: ${lead.course?.name}`);
    console.log('');
  }

  await prisma.$disconnect();
}

checkCommercials().catch(e => {
  console.error(e);
  process.exit(1);
});
