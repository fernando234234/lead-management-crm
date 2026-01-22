import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Real commercial names from CSV
const REAL_COMMERCIALS = [
  { name: 'Simone', username: 'simone.' },
  { name: 'Marilena', username: 'marilena.' },
  { name: 'Marcella', username: 'marcella.' },
  { name: 'Eleonora', username: 'eleonora.' },
  { name: 'Martina', username: 'martina.' },
  { name: 'Natascia', username: 'natascia.' },
  { name: 'Silvana', username: 'silvana.' },
]

const DEFAULT_PASSWORD = 'JFcommerciale2025!'

async function main() {
  console.log('=== Starting Migration to Username-Based Login ===\n')

  // 1. Check current users
  console.log('1. Current users in database:')
  const currentUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, username: true }
  })
  currentUsers.forEach(u => {
    console.log(`   - ${u.name} (${u.role}) | email: ${u.email} | username: ${u.username || 'NULL'}`)
  })
  console.log('')

  // 2. Add usernames to admin/marketing users (keep them)
  console.log('2. Updating admin/marketing users with usernames...')
  const adminMarketingUsers = currentUsers.filter(u => u.role !== 'COMMERCIAL')
  
  // Count existing marketing usernames to avoid duplicates
  const existingMarketingUsernames = currentUsers.filter(u => u.username?.startsWith('marketing')).length
  let marketingCounter = existingMarketingUsernames + 1
  
  for (const user of adminMarketingUsers) {
    // Skip if already has username
    if (user.username) {
      console.log(`   - ${user.name} already has username: ${user.username}`)
      continue
    }
    
    let username: string
    if (user.role === 'ADMIN') {
      username = 'admin.'
    } else {
      // For multiple marketing users, append number
      username = marketingCounter === 1 ? 'marketing.' : `marketing${marketingCounter}.`
      marketingCounter++
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: { username }
    })
    console.log(`   - Set username "${username}" for ${user.name} (${user.role})`)
  }
  console.log('')

  // 3. Delete fake commercial users
  console.log('3. Deleting fake commercial users...')
  const fakeCommercials = currentUsers.filter(u => 
    u.role === 'COMMERCIAL' && 
    ['Marco Verdi', 'Sara Martini', 'Luca Pazzi'].includes(u.name)
  )
  
  for (const fake of fakeCommercials) {
    // First, unassign any leads from this user
    const updatedLeads = await prisma.lead.updateMany({
      where: { assignedToId: fake.id },
      data: { assignedToId: null }
    })
    console.log(`   - Unassigned ${updatedLeads.count} leads from ${fake.name}`)
    
    // Delete related records
    await prisma.leadActivity.deleteMany({ where: { userId: fake.id } })
    await prisma.notification.deleteMany({ where: { userId: fake.id } })
    await prisma.task.deleteMany({ where: { userId: fake.id } })
    await prisma.goal.deleteMany({ where: { userId: fake.id } })
    
    // Delete the user
    await prisma.user.delete({ where: { id: fake.id } })
    console.log(`   - Deleted fake user: ${fake.name}`)
  }
  console.log('')

  // 4. Create real commercial users
  console.log('4. Creating real commercial users...')
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)
  
  for (const commercial of REAL_COMMERCIALS) {
    // Check if already exists
    const existing = await prisma.user.findFirst({
      where: { 
        OR: [
          { username: commercial.username },
          { name: commercial.name }
        ]
      }
    })
    
    if (existing) {
      console.log(`   - ${commercial.name} already exists, skipping`)
      continue
    }
    
    await prisma.user.create({
      data: {
        name: commercial.name,
        username: commercial.username,
        email: null, // No email needed
        password: hashedPassword,
        role: 'COMMERCIAL',
        mustChangePassword: true
      }
    })
    console.log(`   - Created: ${commercial.name} (username: ${commercial.username})`)
  }
  console.log('')

  // 5. Show final state
  console.log('5. Final user list:')
  const finalUsers = await prisma.user.findMany({
    select: { id: true, name: true, username: true, role: true, mustChangePassword: true }
  })
  finalUsers.forEach(u => {
    console.log(`   - ${u.name} | username: ${u.username} | role: ${u.role} | mustChangePassword: ${u.mustChangePassword}`)
  })
  
  console.log('\n=== Migration Complete ===')
  console.log(`\nDefault password for commercials: ${DEFAULT_PASSWORD}`)
  console.log('All commercials have mustChangePassword=true')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
