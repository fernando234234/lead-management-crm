// User roles
export type UserRole = 'admin' | 'commercial' | 'marketing';

// Lead status from your notes
export type LeadStatus = 'nuovo' | 'contattato' | 'in_trattativa' | 'iscritto' | 'perso';
export type ContactOutcome = 'positivo' | 'negativo' | 'richiamre' | 'non_risponde';

// User
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Course (Corso)
export interface Course {
  id: string;
  name: string;
  description?: string;
  price: number;
  startDate?: Date;
  endDate?: Date;
  active: boolean;
  createdAt: Date;
}

// Lead - Commercial section from notes
export interface Lead {
  id: string;
  
  // Basic info (DATA, NOME, CORSO)
  createdAt: Date;
  name: string;
  email?: string;
  phone?: string;
  courseId: string;
  course?: Course;
  
  // Lead tracking (TARGET, NOTE)
  target: boolean;
  notes?: string;
  
  // Contact status (CONTATTATO -> SI/NO)
  contacted: boolean;
  contactedAt?: Date;
  contactedBy?: string;
  
  // Call outcome (TEL PER ESITO -> SAPERE ESITO)
  callOutcome?: ContactOutcome;
  outcomeNotes?: string;
  
  // Enrolled status (ISCRITTO -> SI/NO)
  enrolled: boolean;
  enrolledAt?: Date;
  
  // Assigned commercial
  assignedToId?: string;
  assignedTo?: User;
  
  // Marketing source
  campaignId?: string;
  campaign?: Campaign;
}

// Campaign - Marketing section (SORGENTE, CAMPAGNA, COSTO)
export interface Campaign {
  id: string;
  name: string;
  source: string;           // SORGENTE (Facebook, Google, etc.)
  courseId: string;         // Linked to course list
  course?: Course;
  cost: number;             // COSTO
  startDate: Date;
  endDate?: Date;
  active: boolean;
  createdAt: Date;
}

// Profitability metrics (PROF section)
export interface ProfitabilityMetrics {
  campaignId: string;
  campaign?: Campaign;
  
  // RICAVO
  revenue: number;
  
  // SPESA
  totalExpense: number;
  
  // Costs breakdown
  costPerLead: number;         // COSTO PER LEAD
  costPerConsulenza: number;   // COSTO PER CONSULENZA
  costPerContract: number;     // COSTO PER CONTRACT
  
  // Calculated
  roi: number;
  conversionRate: number;
}

// Stats for dashboard
export interface DashboardStats {
  totalLeads: number;
  contactedLeads: number;
  enrolledLeads: number;
  conversionRate: number;
  revenueThisMonth: number;
  costThisMonth: number;
}

// Filters
export interface LeadFilters {
  dateFrom?: Date;
  dateTo?: Date;
  commercialId?: string;
  courseId?: string;
  status?: LeadStatus;
  contacted?: boolean;
  enrolled?: boolean;
}
