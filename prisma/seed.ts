import { PrismaClient, UserRole, LeadStatus, CallOutcome, Platform, CampaignStatus, ActivityType, NotificationType, TaskPriority } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to create dates relative to now
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function cleanDatabase() {
  console.log('🧹 Cleaning database...');
  
  // Use raw SQL to truncate all tables and reset sequences
  await prisma.$executeRaw`TRUNCATE TABLE "LeadActivity" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Task" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Notification" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "ProfitabilityRecord" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "CampaignSpend" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Lead" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Campaign" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Course" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`;
  
  console.log('✅ Database cleaned');
}

async function main() {
  console.log('🌱 Seeding database...');
  console.log('');

  // Clean first
  await cleanDatabase();
  console.log('');

  // ============ USERS ============
  console.log('Creating users...');
  
  const adminPassword = await hash('admin123', 12);
  const userPassword = await hash('user123', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@leadcrm.it',
      name: 'Admin Sistema',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  const commercial1 = await prisma.user.create({
    data: {
      email: 'marco.verdi@leadcrm.it',
      name: 'Marco Verdi',
      password: userPassword,
      role: UserRole.COMMERCIAL,
    },
  });

  const commercial2 = await prisma.user.create({
    data: {
      email: 'sara.martini@leadcrm.it',
      name: 'Sara Martini',
      password: userPassword,
      role: UserRole.COMMERCIAL,
    },
  });

  const commercial3 = await prisma.user.create({
    data: {
      email: 'luca.pazzi@leadcrm.it',
      name: 'Luca Pazzi',
      password: userPassword,
      role: UserRole.COMMERCIAL,
    },
  });

  const marketing1 = await prisma.user.create({
    data: {
      email: 'giulia.rossi@leadcrm.it',
      name: 'Giulia Rossi',
      password: userPassword,
      role: UserRole.MARKETING,
    },
  });

  const marketing2 = await prisma.user.create({
    data: {
      email: 'andrea.bianchi@leadcrm.it',
      name: 'Andrea Bianchi',
      password: userPassword,
      role: UserRole.MARKETING,
    },
  });

  console.log(`✅ Created 6 users`);

  // ============ COURSES ============
  console.log('Creating courses...');

  const courseMarketing = await prisma.course.create({
    data: {
      name: 'Marketing Digitale Avanzato',
      description: 'Impara le strategie avanzate di marketing digitale: SEO, SEM, Social Media Marketing, Email Marketing e Analytics.',
      price: 1200,
      startDate: daysFromNow(30),
      endDate: daysFromNow(120),
      active: true,
    },
  });

  const courseVendite = await prisma.course.create({
    data: {
      name: 'Tecniche di Vendita B2B',
      description: 'Tecniche avanzate di vendita B2B: prospecting, negoziazione, closing e gestione clienti.',
      price: 890,
      startDate: daysFromNow(15),
      endDate: daysFromNow(75),
      active: true,
    },
  });

  const courseLeadership = await prisma.course.create({
    data: {
      name: 'Leadership & Management',
      description: 'Sviluppa le tue competenze di leadership e gestione del team. Comunicazione efficace e motivazione.',
      price: 1500,
      startDate: daysFromNow(45),
      endDate: daysFromNow(135),
      active: true,
    },
  });

  const courseExcel = await prisma.course.create({
    data: {
      name: 'Excel Avanzato per Business',
      description: 'Padroneggia Excel per analisi dati e reportistica aziendale. Pivot, macro e dashboard.',
      price: 450,
      startDate: daysFromNow(7),
      endDate: daysFromNow(37),
      active: true,
    },
  });

  const coursePM = await prisma.course.create({
    data: {
      name: 'Project Management Professional',
      description: 'Preparazione completa alla certificazione PMP. Metodologie Agile e Waterfall.',
      price: 2200,
      startDate: daysFromNow(60),
      endDate: daysFromNow(150),
      active: true,
    },
  });

  const coursePython = await prisma.course.create({
    data: {
      name: 'Python per Data Analysis',
      description: 'Analisi dati con Python, Pandas e NumPy. Visualizzazione con Matplotlib e Seaborn.',
      price: 980,
      startDate: daysFromNow(20),
      endDate: daysFromNow(80),
      active: true,
    },
  });

  console.log(`✅ Created 6 courses`);

  // ============ CAMPAIGNS ============
  console.log('Creating campaigns...');

  const campaignFbMarketing = await prisma.campaign.create({
    data: {
      name: 'Facebook Ads - Marketing Q1 2026',
      platform: Platform.FACEBOOK,
      courseId: courseMarketing.id,
      createdById: marketing1.id,
      budget: 2500,
      status: CampaignStatus.ACTIVE,
      startDate: daysAgo(30),
    },
  });

  const campaignGoogleVendite = await prisma.campaign.create({
    data: {
      name: 'Google Ads - Vendite B2B',
      platform: Platform.GOOGLE_ADS,
      courseId: courseVendite.id,
      createdById: marketing1.id,
      budget: 1800,
      status: CampaignStatus.ACTIVE,
      startDate: daysAgo(25),
    },
  });

  const campaignLinkedinLeadership = await prisma.campaign.create({
    data: {
      name: 'LinkedIn B2B - Leadership Manager',
      platform: Platform.LINKEDIN,
      courseId: courseLeadership.id,
      createdById: marketing2.id,
      budget: 3500,
      status: CampaignStatus.ACTIVE,
      startDate: daysAgo(20),
    },
  });

  const campaignInstagramExcel = await prisma.campaign.create({
    data: {
      name: 'Instagram - Excel per Tutti',
      platform: Platform.INSTAGRAM,
      courseId: courseExcel.id,
      createdById: marketing2.id,
      budget: 800,
      status: CampaignStatus.ACTIVE,
      startDate: daysAgo(15),
    },
  });

  const campaignTiktokPython = await prisma.campaign.create({
    data: {
      name: 'TikTok - Python Giovani Pro',
      platform: Platform.TIKTOK,
      courseId: coursePython.id,
      createdById: marketing1.id,
      budget: 1200,
      status: CampaignStatus.ACTIVE,
      startDate: daysAgo(10),
    },
  });

  const campaignGooglePM = await prisma.campaign.create({
    data: {
      name: 'Google Ads - PMP Certification',
      platform: Platform.GOOGLE_ADS,
      courseId: coursePM.id,
      createdById: marketing2.id,
      budget: 2800,
      status: CampaignStatus.ACTIVE,
      startDate: daysAgo(18),
    },
  });

  console.log(`✅ Created 6 campaigns`);

  // ============ CAMPAIGN SPEND RECORDS ============
  console.log('Creating campaign spend records...');

  const campaignsWithSpend = [
    { campaign: campaignFbMarketing, dailySpend: 80 },
    { campaign: campaignGoogleVendite, dailySpend: 60 },
    { campaign: campaignLinkedinLeadership, dailySpend: 120 },
    { campaign: campaignInstagramExcel, dailySpend: 40 },
    { campaign: campaignTiktokPython, dailySpend: 50 },
    { campaign: campaignGooglePM, dailySpend: 100 },
  ];

  const spendRecordsToCreate: Array<{
    campaignId: string;
    date: Date;
    amount: number;
    notes: string | null;
  }> = [];

  for (const { campaign, dailySpend } of campaignsWithSpend) {
    // Only create 3 spend records per campaign to speed up seeding
    for (let i = 0; i < 3; i++) {
      const variance = (Math.random() - 0.5) * 0.4; // ±20% variance
      spendRecordsToCreate.push({
        campaignId: campaign.id,
        date: daysAgo(i),
        amount: Math.round(dailySpend * (1 + variance) * 100) / 100,
        notes: i === 0 ? 'Spesa odierna' : null,
      });
    }
  }

  await prisma.campaignSpend.createMany({ data: spendRecordsToCreate });
  console.log(`✅ Created ${spendRecordsToCreate.length} campaign spend records`);

  // ============ LEADS ============
  console.log('Creating leads...');

  const leadData = [
    // NUOVO leads (10)
    { name: 'Marco Rossi', status: LeadStatus.NUOVO, course: courseMarketing, campaign: campaignFbMarketing, daysAgo: 1, cost: 28.50 },
    { name: 'Laura Bianchi', status: LeadStatus.NUOVO, course: courseVendite, campaign: campaignGoogleVendite, daysAgo: 2, cost: 32.00 },
    { name: 'Giuseppe Verdi', status: LeadStatus.NUOVO, course: courseExcel, campaign: campaignInstagramExcel, daysAgo: 0, cost: 18.75 },
    { name: 'Anna Ferrari', status: LeadStatus.NUOVO, course: coursePython, campaign: campaignTiktokPython, daysAgo: 1, cost: 22.30 },
    { name: 'Francesco Romano', status: LeadStatus.NUOVO, course: courseLeadership, campaign: campaignLinkedinLeadership, daysAgo: 3, cost: 45.00 },
    { name: 'Chiara Colombo', status: LeadStatus.NUOVO, course: coursePM, campaign: campaignGooglePM, daysAgo: 2, cost: 38.50 },
    { name: 'Alessandro Ricci', status: LeadStatus.NUOVO, course: courseMarketing, campaign: campaignFbMarketing, daysAgo: 0, cost: 26.80 },
    { name: 'Valentina Marino', status: LeadStatus.NUOVO, course: courseVendite, campaign: campaignGoogleVendite, daysAgo: 1, cost: null },
    { name: 'Davide Greco', status: LeadStatus.NUOVO, course: courseExcel, campaign: campaignInstagramExcel, daysAgo: 2, cost: 19.50 },
    { name: 'Federica Russo', status: LeadStatus.NUOVO, course: coursePython, campaign: campaignTiktokPython, daysAgo: 0, cost: null },
    
    // CONTATTATO leads (12)
    { name: 'Matteo Gallo', status: LeadStatus.CONTATTATO, course: courseMarketing, campaign: campaignFbMarketing, daysAgo: 5, cost: 27.90, outcome: CallOutcome.POSITIVO },
    { name: 'Elisa Conti', status: LeadStatus.CONTATTATO, course: courseVendite, campaign: campaignGoogleVendite, daysAgo: 4, cost: 31.20, outcome: CallOutcome.RICHIAMARE },
    { name: 'Simone Bruno', status: LeadStatus.CONTATTATO, course: courseLeadership, campaign: campaignLinkedinLeadership, daysAgo: 6, cost: 48.50, outcome: CallOutcome.POSITIVO },
    { name: 'Martina Giordano', status: LeadStatus.CONTATTATO, course: courseExcel, campaign: campaignInstagramExcel, daysAgo: 3, cost: 17.80, outcome: CallOutcome.NON_RISPONDE },
    { name: 'Andrea Mancini', status: LeadStatus.CONTATTATO, course: coursePM, campaign: campaignGooglePM, daysAgo: 7, cost: 42.00, outcome: CallOutcome.POSITIVO },
    { name: 'Giorgia Rizzo', status: LeadStatus.CONTATTATO, course: coursePython, campaign: campaignTiktokPython, daysAgo: 4, cost: 21.50, outcome: CallOutcome.RICHIAMARE },
    { name: 'Luca Lombardi', status: LeadStatus.CONTATTATO, course: courseMarketing, campaign: campaignFbMarketing, daysAgo: 8, cost: 29.00, outcome: CallOutcome.POSITIVO },
    { name: 'Sara Moretti', status: LeadStatus.CONTATTATO, course: courseVendite, campaign: campaignGoogleVendite, daysAgo: 5, cost: null, outcome: CallOutcome.NON_RISPONDE },
    { name: 'Marco Fontana', status: LeadStatus.CONTATTATO, course: courseLeadership, campaign: campaignLinkedinLeadership, daysAgo: 9, cost: 52.00, outcome: CallOutcome.POSITIVO },
    { name: 'Giulia Santoro', status: LeadStatus.CONTATTATO, course: courseExcel, campaign: campaignInstagramExcel, daysAgo: 6, cost: 16.90, outcome: CallOutcome.RICHIAMARE },
    { name: 'Paolo Mariani', status: LeadStatus.CONTATTATO, course: coursePM, campaign: campaignGooglePM, daysAgo: 10, cost: 39.80, outcome: CallOutcome.POSITIVO },
    { name: 'Elena Costa', status: LeadStatus.CONTATTATO, course: coursePython, campaign: campaignTiktokPython, daysAgo: 7, cost: 23.40, outcome: CallOutcome.POSITIVO },
    
    // IN_TRATTATIVA leads (8)
    { name: 'Roberto De Luca', status: LeadStatus.IN_TRATTATIVA, course: courseMarketing, campaign: campaignFbMarketing, daysAgo: 12, cost: 25.60, outcome: CallOutcome.POSITIVO, isTarget: true },
    { name: 'Silvia Ferrara', status: LeadStatus.IN_TRATTATIVA, course: courseVendite, campaign: campaignGoogleVendite, daysAgo: 10, cost: 33.40, outcome: CallOutcome.POSITIVO, isTarget: true },
    { name: 'Fabio Barbieri', status: LeadStatus.IN_TRATTATIVA, course: courseLeadership, campaign: campaignLinkedinLeadership, daysAgo: 14, cost: 55.00, outcome: CallOutcome.POSITIVO, isTarget: true },
    { name: 'Claudia Palmieri', status: LeadStatus.IN_TRATTATIVA, course: coursePM, campaign: campaignGooglePM, daysAgo: 11, cost: 44.20, outcome: CallOutcome.POSITIVO },
    { name: 'Stefano Serra', status: LeadStatus.IN_TRATTATIVA, course: courseExcel, campaign: campaignInstagramExcel, daysAgo: 8, cost: 18.30, outcome: CallOutcome.POSITIVO },
    { name: 'Monica Villa', status: LeadStatus.IN_TRATTATIVA, course: coursePython, campaign: campaignTiktokPython, daysAgo: 9, cost: 24.80, outcome: CallOutcome.POSITIVO, isTarget: true },
    { name: 'Daniele Fabbri', status: LeadStatus.IN_TRATTATIVA, course: courseMarketing, campaign: campaignFbMarketing, daysAgo: 13, cost: null, outcome: CallOutcome.POSITIVO },
    { name: 'Cristina Marchetti', status: LeadStatus.IN_TRATTATIVA, course: courseVendite, campaign: campaignGoogleVendite, daysAgo: 15, cost: 30.50, outcome: CallOutcome.POSITIVO, isTarget: true },
    
    // ISCRITTO leads (10)
    { name: 'Antonio Vitale', status: LeadStatus.ISCRITTO, course: courseMarketing, campaign: campaignFbMarketing, daysAgo: 20, cost: 24.50, outcome: CallOutcome.POSITIVO },
    { name: 'Francesca Gatti', status: LeadStatus.ISCRITTO, course: courseVendite, campaign: campaignGoogleVendite, daysAgo: 18, cost: 28.90, outcome: CallOutcome.POSITIVO },
    { name: 'Riccardo Leone', status: LeadStatus.ISCRITTO, course: courseLeadership, campaign: campaignLinkedinLeadership, daysAgo: 22, cost: 50.00, outcome: CallOutcome.POSITIVO },
    { name: 'Alessia Monti', status: LeadStatus.ISCRITTO, course: coursePM, campaign: campaignGooglePM, daysAgo: 16, cost: 41.30, outcome: CallOutcome.POSITIVO },
    { name: 'Giovanni Parisi', status: LeadStatus.ISCRITTO, course: courseExcel, campaign: campaignInstagramExcel, daysAgo: 14, cost: 15.80, outcome: CallOutcome.POSITIVO },
    { name: 'Lucia Riva', status: LeadStatus.ISCRITTO, course: coursePython, campaign: campaignTiktokPython, daysAgo: 12, cost: 20.70, outcome: CallOutcome.POSITIVO },
    { name: 'Tommaso Ferretti', status: LeadStatus.ISCRITTO, course: courseMarketing, campaign: campaignFbMarketing, daysAgo: 25, cost: 26.20, outcome: CallOutcome.POSITIVO },
    { name: 'Beatrice Caruso', status: LeadStatus.ISCRITTO, course: courseVendite, campaign: campaignGoogleVendite, daysAgo: 21, cost: 29.80, outcome: CallOutcome.POSITIVO },
    { name: 'Nicola Pellegrini', status: LeadStatus.ISCRITTO, course: courseLeadership, campaign: campaignLinkedinLeadership, daysAgo: 28, cost: 47.60, outcome: CallOutcome.POSITIVO },
    { name: 'Serena Bassi', status: LeadStatus.ISCRITTO, course: coursePM, campaign: campaignGooglePM, daysAgo: 19, cost: 43.50, outcome: CallOutcome.POSITIVO },
    
    // PERSO leads (5)
    { name: 'Pietro Testa', status: LeadStatus.PERSO, course: courseMarketing, campaign: campaignFbMarketing, daysAgo: 30, cost: 27.00, outcome: CallOutcome.NEGATIVO },
    { name: 'Ilaria Neri', status: LeadStatus.PERSO, course: courseVendite, campaign: campaignGoogleVendite, daysAgo: 25, cost: 35.40, outcome: CallOutcome.NEGATIVO },
    { name: 'Emanuele Grassi', status: LeadStatus.PERSO, course: courseLeadership, campaign: campaignLinkedinLeadership, daysAgo: 28, cost: 58.00, outcome: CallOutcome.NEGATIVO },
    { name: 'Aurora Sartori', status: LeadStatus.PERSO, course: coursePM, campaign: campaignGooglePM, daysAgo: 22, cost: null, outcome: CallOutcome.NEGATIVO },
    { name: 'Filippo Orlando', status: LeadStatus.PERSO, course: courseExcel, campaign: campaignInstagramExcel, daysAgo: 18, cost: 19.20, outcome: CallOutcome.NEGATIVO },
  ];

  const commercials = [commercial1, commercial2, commercial3];
  
  // Use createMany for faster insertion
  const leadsToCreate = leadData.map((data, i) => {
    const commercial = commercials[i % commercials.length];
    const contacted = data.status !== LeadStatus.NUOVO;
    const enrolled = data.status === LeadStatus.ISCRITTO;
    
    return {
      name: data.name,
      email: `${data.name.toLowerCase().replace(' ', '.')}@email.com`,
      phone: `+39 ${Math.floor(Math.random() * 900000000 + 300000000)}`,
      courseId: data.course.id,
      campaignId: data.campaign.id,
      assignedToId: commercial.id,
      isTarget: data.isTarget || false,
      contacted,
      contactedAt: contacted ? daysAgo(data.daysAgo - 1) : null,
      contactedById: contacted ? commercial.id : null,
      callOutcome: data.outcome || null,
      outcomeNotes: data.outcome ? `Chiamata ${data.outcome.toLowerCase().replace('_', ' ')}` : null,
      enrolled,
      enrolledAt: enrolled ? daysAgo(data.daysAgo - 5) : null,
      status: data.status,
      acquisitionCost: data.cost || null,
      notes: data.isTarget ? 'Lead prioritario - azienda target' : null,
      createdAt: daysAgo(data.daysAgo),
    };
  });

  await prisma.lead.createMany({ data: leadsToCreate });
  
  // Fetch created leads for activities
  const createdLeads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: leadData.length,
  });

  console.log(`✅ Created ${leadData.length} leads`);

  // ============ LEAD ACTIVITIES ============
  console.log('Creating lead activities...');

  const activitiesToCreate: Array<{
    leadId: string;
    userId: string;
    type: ActivityType;
    description: string;
    createdAt: Date;
  }> = [];

  for (let i = 0; i < createdLeads.length; i++) {
    const lead = createdLeads[i];
    const commercial = commercials[i % commercials.length];
    
    // Creation activity
    activitiesToCreate.push({
      leadId: lead.id,
      userId: marketing1.id,
      type: ActivityType.NOTE,
      description: 'Lead acquisito dalla campagna pubblicitaria',
      createdAt: lead.createdAt,
    });

    // If contacted, add call activity
    if (lead.contacted && lead.contactedAt) {
      activitiesToCreate.push({
        leadId: lead.id,
        userId: commercial.id,
        type: ActivityType.CALL,
        description: `Chiamata effettuata - Esito: ${lead.callOutcome || 'N/A'}`,
        createdAt: lead.contactedAt,
      });
    }

    // If enrolled, add enrollment activity
    if (lead.enrolled && lead.enrolledAt) {
      activitiesToCreate.push({
        leadId: lead.id,
        userId: commercial.id,
        type: ActivityType.ENROLLMENT,
        description: 'Cliente iscritto al corso',
        createdAt: lead.enrolledAt,
      });
    }
  }

  await prisma.leadActivity.createMany({ data: activitiesToCreate });
  console.log(`✅ Created ${activitiesToCreate.length} lead activities`);

  // ============ TASKS ============
  console.log('Creating tasks...');

  const taskTemplates = [
    { title: 'Richiamare cliente', priority: TaskPriority.HIGH },
    { title: 'Inviare brochure corso', priority: TaskPriority.MEDIUM },
    { title: 'Follow-up proposta', priority: TaskPriority.HIGH },
    { title: 'Verificare pagamento', priority: TaskPriority.MEDIUM },
    { title: 'Inviare reminder iscrizione', priority: TaskPriority.LOW },
  ];

  const tasksToCreate: Array<{
    userId: string;
    leadId: string;
    title: string;
    description: string;
    dueDate: Date;
    priority: TaskPriority;
    completed: boolean;
    completedAt?: Date;
  }> = [];

  const pendingLeads = createdLeads.filter(l => 
    l.status === LeadStatus.CONTATTATO || l.status === LeadStatus.IN_TRATTATIVA
  );

  for (let i = 0; i < pendingLeads.length; i++) {
    const lead = pendingLeads[i];
    const commercial = commercials[i % commercials.length];
    const template = taskTemplates[i % taskTemplates.length];
    
    tasksToCreate.push({
      userId: commercial.id,
      leadId: lead.id,
      title: template.title,
      description: `${template.title} per ${lead.name}`,
      dueDate: daysFromNow(Math.floor(Math.random() * 7) + 1),
      priority: template.priority,
      completed: false,
    });
  }

  // Add some completed tasks
  const enrolledLeads = createdLeads.filter(l => l.status === LeadStatus.ISCRITTO);
  for (let i = 0; i < Math.min(5, enrolledLeads.length); i++) {
    const commercial = commercials[i % commercials.length];
    const enrolledLead = enrolledLeads[i];
    
    tasksToCreate.push({
      userId: commercial.id,
      leadId: enrolledLead.id,
      title: 'Chiudere trattativa',
      description: `Finalizzare iscrizione per ${enrolledLead.name}`,
      dueDate: daysAgo(i + 1),
      priority: TaskPriority.HIGH,
      completed: true,
      completedAt: daysAgo(i),
    });
  }

  await prisma.task.createMany({ data: tasksToCreate });
  console.log(`✅ Created ${tasksToCreate.length} tasks`);

  // ============ NOTIFICATIONS ============
  console.log('Creating notifications...');

  const notifications = [
    { userId: commercial1.id, type: NotificationType.LEAD_ASSIGNED, title: 'Nuovo lead assegnato', message: 'Ti è stato assegnato un nuovo lead: Marco Rossi' },
    { userId: commercial1.id, type: NotificationType.REMINDER, title: 'Promemoria chiamata', message: 'Ricorda di richiamare Laura Bianchi oggi' },
    { userId: commercial2.id, type: NotificationType.LEAD_ENROLLED, title: 'Nuova iscrizione!', message: 'Il lead Antonio Vitale si è iscritto al corso Marketing Digitale' },
    { userId: commercial2.id, type: NotificationType.LEAD_ASSIGNED, title: 'Nuovo lead assegnato', message: 'Ti è stato assegnato un nuovo lead: Giuseppe Verdi' },
    { userId: commercial3.id, type: NotificationType.LEAD_STATUS_CHANGED, title: 'Cambio stato lead', message: 'Il lead Roberto De Luca è passato a In Trattativa' },
    { userId: marketing1.id, type: NotificationType.CAMPAIGN_CREATED, title: 'Campagna creata', message: 'La campagna Facebook Ads - Marketing Q1 2026 è stata attivata' },
    { userId: marketing2.id, type: NotificationType.SYSTEM, title: 'Report settimanale', message: 'Il report settimanale delle campagne è disponibile' },
    { userId: admin.id, type: NotificationType.SYSTEM, title: 'Nuovo utente', message: 'Un nuovo utente commerciale è stato aggiunto al sistema' },
  ];

  const notificationsToCreate = notifications.map(notif => ({
    ...notif,
    read: Math.random() > 0.5,
    createdAt: daysAgo(Math.floor(Math.random() * 7)),
  }));

  await prisma.notification.createMany({ data: notificationsToCreate });
  console.log(`✅ Created ${notifications.length} notifications`);

  // ============ PROFITABILITY RECORDS ============
  console.log('Creating profitability records...');

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const profitRecords = [
    { courseId: courseMarketing.id, revenue: 12000, expense: 1800, leads: 35, contacted: 28, enrolled: 10 },
    { courseId: courseVendite.id, revenue: 7120, expense: 1200, leads: 28, contacted: 22, enrolled: 8 },
    { courseId: courseLeadership.id, revenue: 10500, expense: 2100, leads: 22, contacted: 18, enrolled: 7 },
    { courseId: courseExcel.id, revenue: 2700, expense: 600, leads: 18, contacted: 14, enrolled: 6 },
    { courseId: coursePM.id, revenue: 8800, expense: 1600, leads: 15, contacted: 12, enrolled: 4 },
    { courseId: coursePython.id, revenue: 4900, expense: 900, leads: 20, contacted: 16, enrolled: 5 },
  ];

  for (const record of profitRecords) {
    await prisma.profitabilityRecord.create({
      data: {
        month: currentMonth,
        year: currentYear,
        courseId: record.courseId,
        revenue: record.revenue,
        totalExpense: record.expense,
        costPerLead: record.expense / record.leads,
        costPerConsulenza: record.expense / record.contacted,
        costPerContract: record.expense / record.enrolled,
        totalLeads: record.leads,
        totalContacted: record.contacted,
        totalEnrolled: record.enrolled,
      },
    });
  }

  console.log(`✅ Created ${profitRecords.length} profitability records`);

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log('   - 6 Users (1 Admin, 3 Commercial, 2 Marketing)');
  console.log('   - 6 Courses');
  console.log('   - 6 Campaigns with spend records');
  console.log('   - 45 Leads (10 Nuovo, 12 Contattato, 8 In Trattativa, 10 Iscritto, 5 Perso)');
  console.log('   - Lead activities, tasks, and notifications');
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
