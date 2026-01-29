// User roles
export type UserRole = 'admin' | 'commercial' | 'marketing';

// Tri-state for lead fields (Contattato, Target, Iscritto)
export type TriState = 'SI' | 'NO' | 'ND';

// Legacy lead status (kept for migration compatibility)
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
  
  // Notes
  notes?: string;
  
  // Tri-state fields: SI (yes), NO (no), ND (not determined)
  contattatoStato: TriState;
  contattatoAt?: Date;
  contattatoById?: string;
  contattatoNote?: string;
  
  targetStato: TriState;
  targetNote?: string;
  
  iscrittoStato: TriState;
  iscrittoAt?: Date;
  iscrittoNote?: string;
  
  // Legacy fields (kept for migration compatibility)
  target?: boolean;
  contacted?: boolean;
  contactedAt?: Date;
  contactedBy?: string;
  callOutcome?: ContactOutcome;
  outcomeNotes?: string;
  enrolled?: boolean;
  enrolledAt?: Date;
  
  // Assigned commercial
  assignedToId?: string;
  assignedTo?: User;
  
  // Marketing source
  campaignId?: string;
  campaign?: Campaign;
}

// Campaign - Marketing section (evergreen container - no dates)
// Date-based attribution uses Lead.createdAt matched against CampaignSpend.startDate/endDate
export interface Campaign {
  id: string;
  name: string;
  platform: string;         // Platform (META, GOOGLE_ADS, LINKEDIN, TIKTOK)
  courseId: string;         // Linked to course list
  course?: Course;
  status: string;           // DRAFT, ACTIVE, PAUSED, COMPLETED
  totalSpent?: number;      // Aggregated from CampaignSpend records
  leadCount?: number;       // Count of leads
  costPerLead?: number;     // Calculated: totalSpent / leadCount
  masterCampaignId?: string;
  createdAt: Date;
  updatedAt?: Date;
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
