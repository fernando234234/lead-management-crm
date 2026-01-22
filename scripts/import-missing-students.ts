import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface MissingStudent {
  name: string;
  course: string;
  commercial: string;
  dataStipula: string;
  statoPagamenti: string;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(p => parseInt(p, 10));
  return new Date(year, month - 1, day);
}

function normalizeUsername(name: string): string {
  // Convert "Raffaele Zambella" -> "raffaele."
  const firstName = name.trim().split(/\s+/)[0].toLowerCase();
  return `${firstName}.`;
}

async function main() {
  // First, fix missing course prices
  console.log('Fixing missing course prices...\n');
  
  await prisma.course.updateMany({
    where: { name: 'Brand Communication' },
    data: { price: 577 }
  });
  
  await prisma.course.updateMany({
    where: { name: 'Masterclass in Game Design' },
    data: { price: 2377 }
  });
  
  await prisma.course.updateMany({
    where: { name: 'Attività Individuale' },
    data: { price: 600 }
  });
  
  console.log('Fixed Brand Communication to €577');
  console.log('Fixed Masterclass in Game Design to €2377');
  console.log('Fixed Attività Individuale to €600\n');
  
  // Load missing students
  let missingStudents: MissingStudent[] = JSON.parse(
    fs.readFileSync('scripts/missing-students.json', 'utf-8')
  );
  
  // EXCLUDE leads from Benedetta Barbarisi
  const beforeFilter = missingStudents.length;
  missingStudents = missingStudents.filter(s => 
    !s.commercial.toLowerCase().includes('benedetta')
  );
  console.log(`Filtered out ${beforeFilter - missingStudents.length} leads from Benedetta Barbarisi`);
  console.log(`Loaded ${missingStudents.length} missing students to import\n`);
  
  // Get course ID and price mapping
  const courses = await prisma.course.findMany({
    select: { id: true, name: true, price: true }
  });
  const courseMap = new Map(courses.map(c => [c.name.toLowerCase(), c]));
  
  // Get existing users
  const existingUsers = await prisma.user.findMany({
    select: { id: true, username: true, name: true }
  });
  const userByUsername = new Map(existingUsers.map(u => [u.username.toLowerCase(), u]));
  
  // Get default campaign mapping (one per course)
  const campaigns = await prisma.campaign.findMany({
    select: { id: true, courseId: true }
  });
  const campaignByCourse = new Map(campaigns.filter(c => c.courseId).map(c => [c.courseId!, c.id]));
  
  // Track new commercials to create
  const newCommercials = new Map<string, string>(); // username -> full name
  
  // First pass: identify all unique commercials
  for (const student of missingStudents) {
    const commercialName = student.commercial.trim();
    if (!commercialName) continue;
    
    const username = normalizeUsername(commercialName);
    if (!userByUsername.has(username) && !newCommercials.has(username)) {
      newCommercials.set(username, commercialName);
    }
  }
  
  // Create new commercials
  if (newCommercials.size > 0) {
    console.log('Creating new commercial users:');
    for (const [username, fullName] of newCommercials) {
      const newUser = await prisma.user.create({
        data: {
          username: username,
          name: fullName,
          password: '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', // JFcommerciale2025!
          role: 'COMMERCIAL',
          mustChangePassword: true
        }
      });
      userByUsername.set(username, { id: newUser.id, username: newUser.username, name: newUser.name });
      console.log(`  Created: ${username} (${fullName})`);
    }
    console.log('');
  }
  
  // Stats
  let created = 0;
  let courseNotFound = 0;
  const errors: string[] = [];
  
  for (const student of missingStudents) {
    const courseName = student.course.toLowerCase();
    const course = courseMap.get(courseName);
    
    if (!course) {
      errors.push(`Course not found: "${student.course}" for ${student.name}`);
      courseNotFound++;
      continue;
    }
    
    // Get commercial
    const username = normalizeUsername(student.commercial);
    const user = userByUsername.get(username);
    const assignedToId = user?.id || null;
    
    // Get campaign for this course
    const campaignId = campaignByCourse.get(course.id) || null;
    
    // Parse enrollment date
    const enrolledAt = parseDate(student.dataStipula);
    
    // Create the lead as enrolled
    try {
      await prisma.lead.create({
        data: {
          name: student.name.trim(),
          courseId: course.id,
          campaignId: campaignId,
          assignedToId: assignedToId,
          status: 'ISCRITTO',
          enrolled: true,
          enrolledAt: enrolledAt,
          contacted: true,
          contactedAt: enrolledAt,
          revenue: course.price,
          source: 'LEGACY_IMPORT',
          notes: `Imported from contracts. Payment status: ${student.statoPagamenti}`
        }
      });
      created++;
    } catch (error: any) {
      errors.push(`Failed to create ${student.name}: ${error.message}`);
    }
  }
  
  console.log('\n=== IMPORT RESULTS ===');
  console.log(`Created: ${created}`);
  console.log(`Course not found: ${courseNotFound}`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
    if (errors.length > 10) console.log(`  ... and ${errors.length - 10} more`);
  }
  
  // Show new totals
  const totalLeads = await prisma.lead.count();
  const totalEnrolled = await prisma.lead.count({ where: { status: 'ISCRITTO' } });
  const totalRevenue = await prisma.lead.aggregate({
    where: { status: 'ISCRITTO' },
    _sum: { revenue: true }
  });
  
  console.log('\n=== NEW TOTALS ===');
  console.log(`Total leads: ${totalLeads}`);
  console.log(`Total enrolled: ${totalEnrolled}`);
  console.log(`Total revenue: €${totalRevenue._sum.revenue}`);
  
  // Show all commercials now
  const allUsers = await prisma.user.findMany({
    where: { role: 'COMMERCIAL' },
    select: { username: true, name: true }
  });
  console.log('\n=== ALL COMMERCIALS ===');
  allUsers.forEach(u => console.log(`  ${u.username} - ${u.name}`));
  
  await prisma.$disconnect();
}

main().catch(console.error);
