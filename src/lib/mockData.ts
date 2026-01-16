// Mock data for demo/showcase mode

export const mockStats = {
  overview: {
    totalLeads: 342,
    contactedLeads: 287,
    enrolledLeads: 87,
    conversionRate: "25.4",
    totalCourses: 8,
    activeCourses: 6,
    totalCampaigns: 12,
    activeCampaigns: 5,
    totalUsers: 15,
    commercialUsers: 8,
  },
  financial: {
    totalRevenue: 87000,
    totalCost: 24500,
    costPerLead: "71.64",
    roi: "255.1",
  },
  leadsByStatus: [
    { status: "NUOVO", count: 55 },
    { status: "CONTATTATO", count: 120 },
    { status: "IN_TRATTATIVA", count: 80 },
    { status: "ISCRITTO", count: 87 },
    { status: "PERSO", count: 45 },
  ],
  recentLeads: [
    { id: "1", name: "Marco Rossi", course: "Excel Avanzato", assignedTo: "Marco V.", status: "NUOVO", createdAt: new Date().toISOString() },
    { id: "2", name: "Laura Bianchi", course: "Power BI", assignedTo: "Sara M.", status: "CONTATTATO", createdAt: new Date().toISOString() },
    { id: "3", name: "Giuseppe Verdi", course: "Python per Data Analysis", assignedTo: "Luca P.", status: "IN_TRATTATIVA", createdAt: new Date().toISOString() },
    { id: "4", name: "Anna Ferrari", course: "Excel Avanzato", assignedTo: "Marco V.", status: "ISCRITTO", createdAt: new Date().toISOString() },
    { id: "5", name: "Roberto Esposito", course: "SQL Fundamentals", assignedTo: "Sara M.", status: "NUOVO", createdAt: new Date().toISOString() },
  ],
  topCampaigns: [
    { id: "1", name: "Facebook - Excel Q1", course: "Excel Avanzato", leads: 85, budget: 2400 },
    { id: "2", name: "Google - Power BI", course: "Power BI", leads: 68, budget: 3200 },
    { id: "3", name: "LinkedIn - Python", course: "Python per Data Analysis", leads: 52, budget: 1800 },
    { id: "4", name: "Instagram - SQL", course: "SQL Fundamentals", leads: 45, budget: 1500 },
    { id: "5", name: "TikTok - Excel Base", course: "Excel Base", leads: 38, budget: 800 },
  ],
};

// Helper to create dates relative to now
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const mockLeads = [
  // NUOVO leads
  { id: "1", name: "Marco Rossi", email: "marco.rossi@email.com", phone: "+39 333 1234567", status: "NUOVO", contacted: false, contactedAt: null, enrolled: false, enrolledAt: null, isTarget: true, notes: "Interessato al corso avanzato", callOutcome: null, outcomeNotes: null, acquisitionCost: 28.24, createdAt: daysAgo(1), course: { id: "1", name: "Excel Avanzato", price: 890 }, campaign: { id: "1", name: "Facebook - Excel Q1", platform: "FACEBOOK" }, assignedTo: { id: "1", name: "Marco Verdi", email: "marco.verdi@leadcrm.it" } },
  { id: "5", name: "Roberto Esposito", email: "r.esposito@azienda.com", phone: "+39 339 2222222", status: "NUOVO", contacted: false, contactedAt: null, enrolled: false, enrolledAt: null, isTarget: false, notes: null, callOutcome: null, outcomeNotes: null, acquisitionCost: 33.33, createdAt: daysAgo(2), course: { id: "4", name: "SQL Fundamentals", price: 750 }, campaign: { id: "4", name: "Instagram - SQL", platform: "INSTAGRAM" }, assignedTo: null },
  { id: "7", name: "Elena Conti", email: "elena.conti@mail.com", phone: "+39 338 4444444", status: "NUOVO", contacted: false, contactedAt: null, enrolled: false, enrolledAt: null, isTarget: false, notes: null, callOutcome: null, outcomeNotes: null, acquisitionCost: 28.24, createdAt: daysAgo(0), course: { id: "1", name: "Excel Avanzato", price: 890 }, campaign: { id: "1", name: "Facebook - Excel Q1", platform: "FACEBOOK" }, assignedTo: { id: "1", name: "Marco Verdi", email: "marco.verdi@leadcrm.it" } },
  { id: "8", name: "Paolo Santini", email: "p.santini@gmail.com", phone: "+39 329 5555555", status: "NUOVO", contacted: false, contactedAt: null, enrolled: false, enrolledAt: null, isTarget: true, notes: "Richiesta urgente formazione team", callOutcome: null, outcomeNotes: null, acquisitionCost: 34.62, createdAt: daysAgo(10), course: { id: "3", name: "Python per Data Analysis", price: 1500 }, campaign: { id: "3", name: "LinkedIn - Python", platform: "LINKEDIN" }, assignedTo: { id: "2", name: "Sara Martini", email: "sara.m@leadcrm.it" } },
  
  // CONTATTATO leads
  { id: "2", name: "Laura Bianchi", email: "laura.b@company.it", phone: "+39 340 9876543", status: "CONTATTATO", contacted: true, contactedAt: daysAgo(3), enrolled: false, enrolledAt: null, isTarget: false, notes: "Da richiamare lunedì", callOutcome: "RICHIAMARE", outcomeNotes: "Non disponibile nel weekend", acquisitionCost: 47.06, createdAt: daysAgo(5), course: { id: "2", name: "Power BI", price: 1200 }, campaign: { id: "2", name: "Google - Power BI", platform: "GOOGLE_ADS" }, assignedTo: { id: "2", name: "Sara Martini", email: "sara.m@leadcrm.it" } },
  { id: "9", name: "Francesca Ricci", email: "f.ricci@azienda.com", phone: "+39 347 6666666", status: "CONTATTATO", contacted: true, contactedAt: daysAgo(1), enrolled: false, enrolledAt: null, isTarget: false, notes: "Interessata ma vuole più info", callOutcome: "POSITIVO", outcomeNotes: "Inviare brochure corso", acquisitionCost: 28.24, createdAt: daysAgo(4), course: { id: "1", name: "Excel Avanzato", price: 890 }, campaign: { id: "1", name: "Facebook - Excel Q1", platform: "FACEBOOK" }, assignedTo: { id: "1", name: "Marco Verdi", email: "marco.verdi@leadcrm.it" } },
  { id: "10", name: "Alessandro Neri", email: "a.neri@tech.io", phone: "+39 335 7777777", status: "CONTATTATO", contacted: true, contactedAt: daysAgo(2), enrolled: false, enrolledAt: null, isTarget: true, notes: "CEO di startup, budget ok", callOutcome: "POSITIVO", outcomeNotes: "Vuole demo del corso", acquisitionCost: 47.06, createdAt: daysAgo(6), course: { id: "2", name: "Power BI", price: 1200 }, campaign: { id: "2", name: "Google - Power BI", platform: "GOOGLE_ADS" }, assignedTo: { id: "3", name: "Luca Paoli", email: "luca.p@leadcrm.it" } },
  { id: "11", name: "Giulia Marini", email: "giulia.m@corp.it", phone: "+39 340 8888888", status: "CONTATTATO", contacted: true, contactedAt: daysAgo(8), enrolled: false, enrolledAt: null, isTarget: false, notes: null, callOutcome: "NON_RISPONDE", outcomeNotes: "Provare domani mattina", acquisitionCost: 33.33, createdAt: daysAgo(12), course: { id: "4", name: "SQL Fundamentals", price: 750 }, campaign: { id: "4", name: "Instagram - SQL", platform: "INSTAGRAM" }, assignedTo: { id: "1", name: "Marco Verdi", email: "marco.verdi@leadcrm.it" } },
  
  // IN_TRATTATIVA leads
  { id: "3", name: "Giuseppe Verdi", email: "g.verdi@gmail.com", phone: "+39 348 5555555", status: "IN_TRATTATIVA", contacted: true, contactedAt: daysAgo(7), enrolled: false, enrolledAt: null, isTarget: true, notes: "Molto interessato, chiede sconto aziendale", callOutcome: "POSITIVO", outcomeNotes: "Vuole iscrivere anche colleghi", acquisitionCost: 34.62, createdAt: daysAgo(14), course: { id: "3", name: "Python per Data Analysis", price: 1500 }, campaign: { id: "3", name: "LinkedIn - Python", platform: "LINKEDIN" }, assignedTo: { id: "3", name: "Luca Paoli", email: "luca.p@leadcrm.it" } },
  { id: "12", name: "Martina Galli", email: "m.galli@enterprise.com", phone: "+39 328 9999999", status: "IN_TRATTATIVA", contacted: true, contactedAt: daysAgo(5), enrolled: false, enrolledAt: null, isTarget: true, notes: "In attesa approvazione budget HR", callOutcome: "POSITIVO", outcomeNotes: "Conferma entro venerdì", acquisitionCost: 47.06, createdAt: daysAgo(10), course: { id: "2", name: "Power BI", price: 1200 }, campaign: { id: "2", name: "Google - Power BI", platform: "GOOGLE_ADS" }, assignedTo: { id: "2", name: "Sara Martini", email: "sara.m@leadcrm.it" } },
  { id: "13", name: "Davide Colombo", email: "d.colombo@fintech.it", phone: "+39 366 0000000", status: "IN_TRATTATIVA", contacted: true, contactedAt: daysAgo(3), enrolled: false, enrolledAt: null, isTarget: false, notes: "Vuole pagamento rateizzato", callOutcome: "POSITIVO", outcomeNotes: "Proposto piano 3 rate", acquisitionCost: 28.24, createdAt: daysAgo(8), course: { id: "1", name: "Excel Avanzato", price: 890 }, campaign: { id: "1", name: "Facebook - Excel Q1", platform: "FACEBOOK" }, assignedTo: { id: "1", name: "Marco Verdi", email: "marco.verdi@leadcrm.it" } },
  
  // ISCRITTO leads
  { id: "4", name: "Anna Ferrari", email: "anna.ferrari@outlook.com", phone: "+39 320 1111111", status: "ISCRITTO", contacted: true, contactedAt: daysAgo(15), enrolled: true, enrolledAt: daysAgo(10), isTarget: false, notes: "Iscrizione completata", callOutcome: "POSITIVO", outcomeNotes: "Pagamento effettuato", acquisitionCost: 28.24, createdAt: daysAgo(20), course: { id: "1", name: "Excel Avanzato", price: 890 }, campaign: { id: "1", name: "Facebook - Excel Q1", platform: "FACEBOOK" }, assignedTo: { id: "1", name: "Marco Verdi", email: "marco.verdi@leadcrm.it" } },
  { id: "14", name: "Simone Barbieri", email: "s.barbieri@gmail.com", phone: "+39 333 1111222", status: "ISCRITTO", contacted: true, contactedAt: daysAgo(12), enrolled: true, enrolledAt: daysAgo(7), isTarget: true, notes: "Pagamento bonifico ricevuto", callOutcome: "POSITIVO", outcomeNotes: "Ha portato un amico", acquisitionCost: 34.62, createdAt: daysAgo(18), course: { id: "3", name: "Python per Data Analysis", price: 1500 }, campaign: { id: "3", name: "LinkedIn - Python", platform: "LINKEDIN" }, assignedTo: { id: "3", name: "Luca Paoli", email: "luca.p@leadcrm.it" } },
  { id: "15", name: "Valentina Russo", email: "v.russo@company.it", phone: "+39 340 2222333", status: "ISCRITTO", contacted: true, contactedAt: daysAgo(20), enrolled: true, enrolledAt: daysAgo(14), isTarget: false, notes: "Iscrizione aziendale 5 posti", callOutcome: "POSITIVO", outcomeNotes: "Fattura inviata", acquisitionCost: 47.06, createdAt: daysAgo(25), course: { id: "2", name: "Power BI", price: 1200 }, campaign: { id: "2", name: "Google - Power BI", platform: "GOOGLE_ADS" }, assignedTo: { id: "2", name: "Sara Martini", email: "sara.m@leadcrm.it" } },
  
  // PERSO leads
  { id: "6", name: "Chiara Lombardi", email: "chiara.l@startup.io", phone: "+39 347 3333333", status: "PERSO", contacted: true, contactedAt: daysAgo(14), enrolled: false, enrolledAt: null, isTarget: false, notes: "Budget non disponibile", callOutcome: "NEGATIVO", outcomeNotes: "Rimandato al prossimo anno", acquisitionCost: 47.06, createdAt: daysAgo(21), course: { id: "2", name: "Power BI", price: 1200 }, campaign: { id: "2", name: "Google - Power BI", platform: "GOOGLE_ADS" }, assignedTo: { id: "2", name: "Sara Martini", email: "sara.m@leadcrm.it" } },
  { id: "16", name: "Luca Fontana", email: "l.fontana@mail.it", phone: "+39 338 4444555", status: "PERSO", contacted: true, contactedAt: daysAgo(10), enrolled: false, enrolledAt: null, isTarget: false, notes: "Ha scelto concorrente", callOutcome: "NEGATIVO", outcomeNotes: "Prezzo troppo alto", acquisitionCost: 28.24, createdAt: daysAgo(16), course: { id: "1", name: "Excel Avanzato", price: 890 }, campaign: { id: "1", name: "Facebook - Excel Q1", platform: "FACEBOOK" }, assignedTo: { id: "1", name: "Marco Verdi", email: "marco.verdi@leadcrm.it" } },
  { id: "17", name: "Sara Moretti", email: "s.moretti@gmail.com", phone: "+39 329 5555666", status: "PERSO", contacted: true, contactedAt: daysAgo(8), enrolled: false, enrolledAt: null, isTarget: false, notes: "Non più interessata", callOutcome: "NEGATIVO", outcomeNotes: "Cambio priorità lavorative", acquisitionCost: 33.33, createdAt: daysAgo(15), course: { id: "4", name: "SQL Fundamentals", price: 750 }, campaign: { id: "4", name: "Instagram - SQL", platform: "INSTAGRAM" }, assignedTo: { id: "3", name: "Luca Paoli", email: "luca.p@leadcrm.it" } },
];

export const mockCourses = [
  { id: "1", name: "Excel Avanzato", description: "Corso completo di Excel per professionisti", price: 890, startDate: "2024-03-01", endDate: "2024-04-15", active: true, _count: { leads: 85, campaigns: 3 } },
  { id: "2", name: "Power BI", description: "Business Intelligence con Microsoft Power BI", price: 1200, startDate: "2024-03-15", endDate: "2024-05-01", active: true, _count: { leads: 68, campaigns: 2 } },
  { id: "3", name: "Python per Data Analysis", description: "Analisi dati con Python, Pandas e NumPy", price: 1500, startDate: "2024-04-01", endDate: "2024-06-01", active: true, _count: { leads: 52, campaigns: 2 } },
  { id: "4", name: "SQL Fundamentals", description: "Fondamenti di SQL per database relazionali", price: 750, startDate: "2024-03-20", endDate: "2024-04-30", active: true, _count: { leads: 45, campaigns: 1 } },
  { id: "5", name: "Excel Base", description: "Corso introduttivo a Microsoft Excel", price: 450, startDate: "2024-04-10", endDate: "2024-05-10", active: true, _count: { leads: 38, campaigns: 2 } },
  { id: "6", name: "Tableau", description: "Data visualization con Tableau", price: 1100, startDate: "2024-05-01", endDate: "2024-06-15", active: true, _count: { leads: 25, campaigns: 1 } },
  { id: "7", name: "R per Statistici", description: "Analisi statistica con R", price: 1300, startDate: null, endDate: null, active: false, _count: { leads: 12, campaigns: 1 } },
  { id: "8", name: "Machine Learning Intro", description: "Introduzione al Machine Learning", price: 1800, startDate: "2024-06-01", endDate: "2024-08-01", active: false, _count: { leads: 17, campaigns: 0 } },
];

// Updated campaigns with new schema (platform enum, status enum, budget, spendRecords)
export const mockCampaigns = [
  { 
    id: "1", 
    name: "Facebook - Excel Q1", 
    platform: "FACEBOOK",
    // Backward compatibility
    source: "Facebook",
    cost: 2400,
    active: true,
    // New fields
    budget: 3000, 
    status: "ACTIVE",
    totalSpent: 2400,
    startDate: "2024-01-15", 
    endDate: null, 
    createdAt: new Date().toISOString(), 
    course: { id: "1", name: "Excel Avanzato", price: 890 }, 
    createdBy: { id: "5", name: "Giulia Rossi", email: "giulia.rossi@leadcrm.it" },
    spendRecords: [
      { id: "s1", date: "2024-01-15", amount: 500, notes: "Lancio campagna" },
      { id: "s2", date: "2024-01-22", amount: 400, notes: null },
      { id: "s3", date: "2024-01-29", amount: 500, notes: "Boost post" },
      { id: "s4", date: "2024-02-05", amount: 500, notes: null },
      { id: "s5", date: "2024-02-12", amount: 500, notes: null },
    ],
    leadCount: 85,
    costPerLead: 28.24,
    metrics: { totalLeads: 85, contactedLeads: 72, enrolledLeads: 28, costPerLead: "28.24", conversionRate: "32.9" } 
  },
  { 
    id: "2", 
    name: "Google - Power BI", 
    platform: "GOOGLE_ADS",
    source: "Google Ads",
    cost: 3200,
    active: true,
    budget: 4000, 
    status: "ACTIVE",
    totalSpent: 3200,
    startDate: "2024-02-01", 
    endDate: null, 
    createdAt: new Date().toISOString(), 
    course: { id: "2", name: "Power BI", price: 1200 },
    createdBy: { id: "5", name: "Giulia Rossi", email: "giulia.rossi@leadcrm.it" },
    spendRecords: [
      { id: "s6", date: "2024-02-01", amount: 800, notes: "Setup iniziale" },
      { id: "s7", date: "2024-02-08", amount: 800, notes: null },
      { id: "s8", date: "2024-02-15", amount: 800, notes: null },
      { id: "s9", date: "2024-02-22", amount: 800, notes: null },
    ],
    leadCount: 68,
    costPerLead: 47.06,
    metrics: { totalLeads: 68, contactedLeads: 58, enrolledLeads: 18, costPerLead: "47.06", conversionRate: "26.5" } 
  },
  { 
    id: "3", 
    name: "LinkedIn - Python", 
    platform: "LINKEDIN",
    source: "LinkedIn",
    cost: 1800,
    active: true,
    budget: 2500, 
    status: "ACTIVE",
    totalSpent: 1800,
    startDate: "2024-02-15", 
    endDate: null, 
    createdAt: new Date().toISOString(), 
    course: { id: "3", name: "Python per Data Analysis", price: 1500 },
    createdBy: { id: "6", name: "Andrea Neri", email: "andrea.n@leadcrm.it" },
    spendRecords: [
      { id: "s10", date: "2024-02-15", amount: 600, notes: null },
      { id: "s11", date: "2024-02-22", amount: 600, notes: null },
      { id: "s12", date: "2024-03-01", amount: 600, notes: null },
    ],
    leadCount: 52,
    costPerLead: 34.62,
    metrics: { totalLeads: 52, contactedLeads: 45, enrolledLeads: 15, costPerLead: "34.62", conversionRate: "28.8" } 
  },
  { 
    id: "4", 
    name: "Instagram - SQL", 
    platform: "INSTAGRAM",
    source: "Instagram",
    cost: 1500,
    active: true,
    budget: 2000, 
    status: "ACTIVE",
    totalSpent: 1500,
    startDate: "2024-03-01", 
    endDate: null, 
    createdAt: new Date().toISOString(), 
    course: { id: "4", name: "SQL Fundamentals", price: 750 },
    createdBy: { id: "6", name: "Andrea Neri", email: "andrea.n@leadcrm.it" },
    spendRecords: [
      { id: "s13", date: "2024-03-01", amount: 500, notes: null },
      { id: "s14", date: "2024-03-08", amount: 500, notes: "Stories boost" },
      { id: "s15", date: "2024-03-15", amount: 500, notes: null },
    ],
    leadCount: 45,
    costPerLead: 33.33,
    metrics: { totalLeads: 45, contactedLeads: 38, enrolledLeads: 12, costPerLead: "33.33", conversionRate: "26.7" } 
  },
  { 
    id: "5", 
    name: "TikTok - Excel Base", 
    platform: "TIKTOK",
    source: "TikTok",
    cost: 800,
    active: true,
    budget: 1000, 
    status: "ACTIVE",
    totalSpent: 800,
    startDate: "2024-03-10", 
    endDate: null, 
    createdAt: new Date().toISOString(), 
    course: { id: "5", name: "Excel Base", price: 450 },
    createdBy: { id: "5", name: "Giulia Rossi", email: "giulia.rossi@leadcrm.it" },
    spendRecords: [
      { id: "s16", date: "2024-03-10", amount: 400, notes: "Video virale" },
      { id: "s17", date: "2024-03-17", amount: 400, notes: null },
    ],
    leadCount: 38,
    costPerLead: 21.05,
    metrics: { totalLeads: 38, contactedLeads: 30, enrolledLeads: 14, costPerLead: "21.05", conversionRate: "36.8" } 
  },
  { 
    id: "6", 
    name: "Facebook - Power BI Retargeting", 
    platform: "FACEBOOK",
    source: "Facebook",
    cost: 0,
    active: false,
    budget: 1500, 
    status: "DRAFT",
    totalSpent: 0,
    startDate: "2024-04-01", 
    endDate: null, 
    createdAt: new Date().toISOString(), 
    course: { id: "2", name: "Power BI", price: 1200 },
    createdBy: { id: "5", name: "Giulia Rossi", email: "giulia.rossi@leadcrm.it" },
    spendRecords: [],
    leadCount: 0,
    costPerLead: 0,
    metrics: { totalLeads: 0, contactedLeads: 0, enrolledLeads: 0, costPerLead: "0", conversionRate: "0" } 
  },
  { 
    id: "7", 
    name: "LinkedIn - Excel Aziendale", 
    platform: "LINKEDIN",
    source: "LinkedIn",
    cost: 2200,
    active: false,
    budget: 2200, 
    status: "COMPLETED",
    totalSpent: 2200,
    startDate: "2023-10-01", 
    endDate: "2023-12-15", 
    createdAt: new Date().toISOString(), 
    course: { id: "1", name: "Excel Avanzato", price: 890 },
    createdBy: { id: "6", name: "Andrea Neri", email: "andrea.n@leadcrm.it" },
    spendRecords: [
      { id: "s18", date: "2023-10-01", amount: 700, notes: null },
      { id: "s19", date: "2023-11-01", amount: 800, notes: null },
      { id: "s20", date: "2023-12-01", amount: 700, notes: "Chiusura" },
    ],
    leadCount: 42,
    costPerLead: 52.38,
    metrics: { totalLeads: 42, contactedLeads: 40, enrolledLeads: 18, costPerLead: "52.38", conversionRate: "42.9" } 
  },
];

export const mockUsers = [
  { id: "1", name: "Admin User", email: "admin@leadcrm.it", role: "ADMIN", createdAt: new Date().toISOString() },
  { id: "2", name: "Marco Verdi", email: "marco.verdi@leadcrm.it", role: "COMMERCIAL", createdAt: new Date().toISOString() },
  { id: "3", name: "Sara Martini", email: "sara.m@leadcrm.it", role: "COMMERCIAL", createdAt: new Date().toISOString() },
  { id: "4", name: "Luca Paoli", email: "luca.p@leadcrm.it", role: "COMMERCIAL", createdAt: new Date().toISOString() },
  { id: "5", name: "Giulia Rossi", email: "giulia.rossi@leadcrm.it", role: "MARKETING", createdAt: new Date().toISOString() },
  { id: "6", name: "Andrea Neri", email: "andrea.n@leadcrm.it", role: "MARKETING", createdAt: new Date().toISOString() },
];
