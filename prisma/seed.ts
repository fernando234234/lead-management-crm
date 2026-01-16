import { PrismaClient, UserRole, LeadStatus, CallOutcome, Platform, CampaignStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============ USERS ============
  console.log('Creating users...');
  
  const adminPassword = await hash('admin123', 12);
  const userPassword = await hash('user123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@leadcrm.it' },
    update: {},
    create: {
      email: 'admin@leadcrm.it',
      name: 'Admin Sistema',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  const commercial1 = await prisma.user.upsert({
    where: { email: 'marco.verdi@leadcrm.it' },
    update: {},
    create: {
      email: 'marco.verdi@leadcrm.it',
      name: 'Marco Verdi',
      password: userPassword,
      role: UserRole.COMMERCIAL,
    },
  });

  const commercial2 = await prisma.user.upsert({
    where: { email: 'sara.martini@leadcrm.it' },
    update: {},
    create: {
      email: 'sara.martini@leadcrm.it',
      name: 'Sara Martini',
      password: userPassword,
      role: UserRole.COMMERCIAL,
    },
  });

  const commercial3 = await prisma.user.upsert({
    where: { email: 'luca.pazzi@leadcrm.it' },
    update: {},
    create: {
      email: 'luca.pazzi@leadcrm.it',
      name: 'Luca Pazzi',
      password: userPassword,
      role: UserRole.COMMERCIAL,
    },
  });

  const marketing1 = await prisma.user.upsert({
    where: { email: 'giulia.rossi@leadcrm.it' },
    update: {},
    create: {
      email: 'giulia.rossi@leadcrm.it',
      name: 'Giulia Rossi',
      password: userPassword,
      role: UserRole.MARKETING,
    },
  });

  const marketing2 = await prisma.user.upsert({
    where: { email: 'andrea.bianchi@leadcrm.it' },
    update: {},
    create: {
      email: 'andrea.bianchi@leadcrm.it',
      name: 'Andrea Bianchi',
      password: userPassword,
      role: UserRole.MARKETING,
    },
  });

  console.log(`✅ Created ${6} users`);

  // ============ COURSES (Admin-managed) ============
  console.log('Creating courses...');

  const courseMarketing = await prisma.course.upsert({
    where: { id: 'corso-marketing-digitale' },
    update: {},
    create: {
      id: 'corso-marketing-digitale',
      name: 'Corso Marketing Digitale',
      description: 'Impara le basi del marketing digitale: SEO, SEM, Social Media Marketing',
      price: 1200,
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-04-30'),
      active: true,
    },
  });

  const courseVendite = await prisma.course.upsert({
    where: { id: 'corso-tecniche-vendita' },
    update: {},
    create: {
      id: 'corso-tecniche-vendita',
      name: 'Corso Tecniche di Vendita',
      description: 'Tecniche avanzate di vendita B2B e B2C',
      price: 890,
      startDate: new Date('2026-02-15'),
      endDate: new Date('2026-03-30'),
      active: true,
    },
  });

  const courseLeadership = await prisma.course.upsert({
    where: { id: 'corso-leadership' },
    update: {},
    create: {
      id: 'corso-leadership',
      name: 'Corso Leadership & Management',
      description: 'Sviluppa le tue competenze di leadership e gestione del team',
      price: 1500,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-05-31'),
      active: true,
    },
  });

  const courseExcel = await prisma.course.upsert({
    where: { id: 'corso-excel-avanzato' },
    update: {},
    create: {
      id: 'corso-excel-avanzato',
      name: 'Excel Avanzato per Business',
      description: 'Padroneggia Excel per analisi dati e reportistica',
      price: 450,
      startDate: new Date('2026-01-20'),
      endDate: new Date('2026-02-20'),
      active: true,
    },
  });

  const coursePM = await prisma.course.upsert({
    where: { id: 'corso-project-management' },
    update: {},
    create: {
      id: 'corso-project-management',
      name: 'Project Management Professional',
      description: 'Preparazione alla certificazione PMP',
      price: 2200,
      startDate: new Date('2026-04-01'),
      active: true,
    },
  });

  console.log(`✅ Created ${5} courses`);

  // ============ CAMPAIGNS ============
  console.log('Creating campaigns...');

  const campaignFbMarketing = await prisma.campaign.upsert({
    where: { id: 'fb-marketing-gen26' },
    update: {},
    create: {
      id: 'fb-marketing-gen26',
      name: 'Facebook Ads - Marketing Gennaio 2026',
      platform: Platform.FACEBOOK,
      courseId: courseMarketing.id,
      createdById: marketing1.id,
      budget: 1500,
      status: CampaignStatus.ACTIVE,
      startDate: new Date('2026-01-01'),
    },
  });

  const campaignGoogleVendite = await prisma.campaign.upsert({
    where: { id: 'google-vendite-gen26' },
    update: {},
    create: {
      id: 'google-vendite-gen26',
      name: 'Google Ads - Vendite Q1',
      platform: Platform.GOOGLE_ADS,
      courseId: courseVendite.id,
      createdById: marketing1.id,
      budget: 1000,
      status: CampaignStatus.ACTIVE,
      startDate: new Date('2026-01-01'),
    },
  });

  const campaignLinkedinLeadership = await prisma.campaign.upsert({
    where: { id: 'linkedin-leadership-gen26' },
    update: {},
    create: {
      id: 'linkedin-leadership-gen26',
      name: 'LinkedIn B2B - Leadership',
      platform: Platform.LINKEDIN,
      courseId: courseLeadership.id,
      createdById: marketing2.id,
      budget: 3000,
      status: CampaignStatus.ACTIVE,
      startDate: new Date('2026-01-01'),
    },
  });

  const campaignInstagramExcel = await prisma.campaign.upsert({
    where: { id: 'instagram-excel-gen26' },
    update: {},
    create: {
      id: 'instagram-excel-gen26',
      name: 'Instagram Stories - Excel',
      platform: Platform.INSTAGRAM,
      courseId: courseExcel.id,
      createdById: marketing2.id,
      budget: 500,
      status: CampaignStatus.ACTIVE,
      startDate: new Date('2026-01-10'),
    },
  });

  console.log(`✅ Created ${4} campaigns`);

  // ============ LEADS ============
  console.log('Creating leads...');

  const leadNames = [
    'Mario Rossi', 'Laura Bianchi', 'Giuseppe Verdi', 'Anna Ferrari',
    'Francesco Romano', 'Chiara Colombo', 'Alessandro Ricci', 'Valentina Marino',
    'Davide Greco', 'Federica Russo', 'Matteo Gallo', 'Elisa Conti',
    'Simone Bruno', 'Martina Giordano', 'Andrea Mancini', 'Giorgia Rizzo',
    'Luca Lombardi', 'Sara Moretti', 'Marco Fontana', 'Giulia Santoro',
    'Paolo Mariani', 'Elena Costa', 'Roberto De Luca', 'Silvia Ferrara',
    'Fabio Barbieri', 'Claudia Palmieri', 'Stefano Serra', 'Monica Villa',
    'Daniele Fabbri', 'Cristina Marchetti'
  ];

  const commercials = [commercial1, commercial2, commercial3];
  const courses = [courseMarketing, courseVendite, courseLeadership, courseExcel, coursePM];
  const campaigns = [campaignFbMarketing, campaignGoogleVendite, campaignLinkedinLeadership, campaignInstagramExcel];
  const statuses = [LeadStatus.NUOVO, LeadStatus.CONTATTATO, LeadStatus.IN_TRATTATIVA, LeadStatus.ISCRITTO, LeadStatus.PERSO];
  const outcomes = [CallOutcome.POSITIVO, CallOutcome.NEGATIVO, CallOutcome.RICHIAMARE, CallOutcome.NON_RISPONDE];

  for (let i = 0; i < leadNames.length; i++) {
    const name = leadNames[i];
    const course = courses[i % courses.length];
    const campaign = campaigns[i % campaigns.length];
    const commercial = commercials[i % commercials.length];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const contacted = status !== LeadStatus.NUOVO;
    const enrolled = status === LeadStatus.ISCRITTO;
    const hasOutcome = contacted && Math.random() > 0.3;
    
    await prisma.lead.create({
      data: {
        name,
        email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
        phone: `+39 ${Math.floor(Math.random() * 900000000 + 100000000)}`,
        courseId: course.id,
        campaignId: campaign.id,
        assignedToId: commercial.id,
        isTarget: Math.random() > 0.5,
        contacted,
        contactedAt: contacted ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
        contactedById: contacted ? commercial.id : null,
        callOutcome: hasOutcome ? outcomes[Math.floor(Math.random() * outcomes.length)] : null,
        outcomeNotes: hasOutcome ? 'Note sulla chiamata' : null,
        enrolled,
        enrolledAt: enrolled ? new Date() : null,
        status,
        notes: Math.random() > 0.7 ? 'Lead interessato, seguire con attenzione' : null,
      },
    });
  }

  console.log(`✅ Created ${leadNames.length} leads`);

  // ============ PROFITABILITY RECORDS ============
  console.log('Creating profitability records...');

  await prisma.profitabilityRecord.create({
    data: {
      month: 1,
      year: 2026,
      courseId: courseMarketing.id,
      revenue: 14400,
      totalExpense: 1200,
      costPerLead: 28.57,
      costPerConsulenza: 45,
      costPerContract: 120,
      totalLeads: 42,
      totalContacted: 38,
      totalEnrolled: 12,
    },
  });

  await prisma.profitabilityRecord.create({
    data: {
      month: 1,
      year: 2026,
      courseId: courseVendite.id,
      revenue: 8010,
      totalExpense: 850,
      costPerLead: 30.36,
      costPerConsulenza: 50,
      costPerContract: 94.44,
      totalLeads: 28,
      totalContacted: 25,
      totalEnrolled: 9,
    },
  });

  console.log(`✅ Created profitability records`);

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('📧 Demo accounts:');
  console.log('   Admin:      admin@leadcrm.it / admin123');
  console.log('   Commercial: marco.verdi@leadcrm.it / user123');
  console.log('   Marketing:  giulia.rossi@leadcrm.it / user123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
