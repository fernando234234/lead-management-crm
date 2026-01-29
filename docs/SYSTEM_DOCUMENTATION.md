# Lead Management CRM - Complete System Documentation

**Generated:** January 2026  
**Version:** 2.1 (Updated January 29, 2026)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Lead Tracking System](#2-lead-tracking-system)
3. [Call Tracking System](#3-call-tracking-system)
4. [Auto-PERSO Rules](#4-auto-perso-rules)
5. [Campaign & Spend Tracking](#5-campaign--spend-tracking)
6. [Platform Analytics](#6-platform-analytics)
7. [Lead Status Flow](#7-lead-status-flow)
8. [Lead Deletion](#8-lead-deletion)
9. [Revenue & ROI Tracking](#9-revenue--roi-tracking)
10. [User Roles & Permissions](#10-user-roles--permissions)
11. [Forms & Data Entry](#11-forms--data-entry)
12. [API Reference](#12-api-reference)

---

## 1. System Overview

The Lead Management CRM is built for **Job Formazione**, an Italian education company. It manages the full sales funnel from lead acquisition through enrollment.

### Tech Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Supabase)
- **Auth:** NextAuth.js with JWT

### Core Entities
| Entity | Purpose |
|--------|---------|
| Lead | Potential customer interested in a course |
| Campaign | Marketing campaign on ad platforms |
| CampaignSpend | Spend records with date ranges |
| Course | Educational product being sold |
| User | System user (Admin/Commercial/Marketing) |
| LeadActivity | Activity log for lead interactions |

---

## 2. Lead Tracking System

### 2.1 Lead Data Model

```prisma
Lead {
  // Identity
  id              String
  name            String (required)
  email           String?
  phone           String?
  
  // Relationships
  courseId        String (required)
  campaignId      String?
  assignedToId    String?
  createdById     String?
  contactedById   String?
  
  // Status
  status          LeadStatus (NUOVO | CONTATTATO | IN_TRATTATIVA | ISCRITTO | PERSO)
  source          LeadSource (LEGACY_IMPORT | MANUAL | CAMPAIGN)
  
  // Contact tracking
  contacted       Boolean (default: false)
  contactedAt     DateTime?
  
  // Call tracking
  callAttempts    Int (default: 0)
  firstAttemptAt  DateTime?
  lastAttemptAt   DateTime?
  callOutcome     CallOutcome? (POSITIVO | RICHIAMARE | NEGATIVO)
  outcomeNotes    String?
  
  // Enrollment
  enrolled        Boolean (default: false)
  enrolledAt      DateTime?
  
  // Target qualification
  isTarget        Boolean (default: false)
  targetNote      String?
  
  // Financial
  acquisitionCost Decimal?
  revenue         Decimal?
  
  // Other
  notes           String?
  createdAt       DateTime
  updatedAt       DateTime
}
```

### 2.2 Lead Status Flow

```
NUOVO → CONTATTATO → IN_TRATTATIVA → ISCRITTO
   ↓         ↓              ↓
   └─────────┴──────────────┴───────────→ PERSO

Auto-PERSO triggers:
- NEGATIVO call outcome (immediate)
- 8 failed call attempts
- 15 days since last call attempt
- 20 days since contact (legacy leads)
```

### 2.3 Lead Visibility Rules

| Role | Can See |
|------|---------|
| ADMIN | All leads |
| COMMERCIAL | Leads assigned to them OR created by them |
| MARKETING | Leads from campaigns they created |

---

## 3. Call Tracking System

### 3.1 Overview

Commercials must log call outcomes when contacting leads. The system tracks:
- Number of call attempts (max 8)
- First and last attempt timestamps
- Call outcome and notes

### 3.2 Call Outcomes (3 Options)

| Outcome | Italian Label | Description | Auto-Actions |
|---------|---------------|-------------|--------------|
| `POSITIVO` | Interessato | Lead is interested | Sets `contacted=true`, continues in funnel |
| `RICHIAMARE` | Da Richiamare | No answer / call back later | Increments attempt counter (max 8) |
| `NEGATIVO` | Non Interessato | Lead declined | **Immediate PERSO** |

### 3.3 Call Tracking Fields

Every call outcome updates:
1. `callAttempts` ← increment by 1
2. `lastAttemptAt` ← current timestamp
3. `firstAttemptAt` ← current timestamp (only if null)

### 3.4 Call Modal UI

When a commercial marks a lead as contacted:
1. Modal appears with attempt counter ("Tentativo #X di 8")
2. Must select outcome (required)
3. Can add notes (optional)
4. Shows warning at 8th attempt
5. Shows days remaining before auto-PERSO

### 3.5 Attempt Counter Display

In lead tables, uncontacted leads show badge:
- `X/8` format
- Color coding: gray (<4), yellow (4-5), red (6+)

---

## 4. Auto-PERSO Rules

The system automatically marks leads as PERSO under these conditions:

### 4.1 Rule 1: NEGATIVO Outcome (Immediate)

```typescript
if (callOutcome === 'NEGATIVO') {
  status = 'PERSO';  // Immediate
}
```

**File:** `src/app/api/leads/[id]/route.ts`

### 4.2 Rule 2: 8 Call Attempts

```typescript
if (callAttempts >= 8 && callOutcome === 'RICHIAMARE') {
  status = 'PERSO';
}
```

**File:** `src/app/api/leads/[id]/route.ts`

### 4.3 Rule 3: 15 Days Inactive (Page Load)

```typescript
// Runs on every leads page load
if (lastAttemptAt < 15_days_ago && status in ['NUOVO', 'CONTATTATO', 'IN_TRATTATIVA']) {
  status = 'PERSO';
}
```

**File:** `src/app/api/leads/route.ts` (`autoCleanupStaleLeads()`)

### 4.4 Rule 4: 20 Days Legacy Cleanup

```typescript
// For leads without call tracking (legacy imports)
if (contactedAt < 20_days_ago && lastAttemptAt === null && status === 'CONTATTATO') {
  status = 'PERSO';
}
```

**File:** `src/app/api/leads/route.ts` (`autoCleanupStaleLeads()`)

### 4.5 PERSO Filter

All lead pages default to hiding PERSO leads:
- Filter options: "Attivi (no PERSO)" | "Tutti" | "Solo PERSO"
- Default: "Attivi (no PERSO)"

---

## 5. Campaign & Spend Tracking

### 5.1 Data Models

```prisma
Campaign {
  id               String
  masterCampaignId String?
  name             String
  platform         Platform (META | GOOGLE_ADS | LINKEDIN | TIKTOK)
  budget           Decimal (DEPRECATED - always 0)
  status           CampaignStatus (DRAFT | ACTIVE | PAUSED | COMPLETED)
  startDate        DateTime
  endDate          DateTime?
  courseId         String?
  createdById      String
  spendRecords     CampaignSpend[]
}

CampaignSpend {
  id         String
  campaignId String
  startDate  DateTime (required)
  endDate    DateTime? (null = ongoing)
  amount     Decimal
  notes      String?
}
```

### 5.2 Pro-Rata Spend Calculation

When filtering by date range, spend is attributed proportionally:

```
Pro-rata = amount * (overlapDays / totalDays)

Example:
- Spend: Jan 1 - Mar 31 (90 days), EUR 1000
- Filter: February (28 days overlap)
- Pro-rata: EUR 1000 * (28/90) = EUR 311.11
```

**Implementation:** `src/lib/spendProRata.ts`

### 5.3 CPL Calculation

```
CPL = Pro-rata Spend / Leads Created in Same Period
```

Both numerator and denominator are aligned to the same date range.

---

## 6. Platform Analytics

### 6.1 Overview

The **Platform Analytics** page (`/marketing/platforms` and `/admin/platforms`) provides aggregated performance metrics by advertising platform (Meta, Google Ads, LinkedIn, TikTok).

**Key Feature:** This is a **read-only analytics page** - it does not store any new data. All metrics are calculated from existing `CampaignSpend` records via the `/api/campaigns` endpoint.

### 6.2 Available Metrics

| Metric | Description |
|--------|-------------|
| **Spesa Totale** | Total spend across all campaigns for a platform |
| **Lead Totali** | Total leads generated by platform |
| **Iscritti** | Enrolled leads by platform |
| **CPL** | Cost Per Lead (Spend / Leads) |
| **Conversione** | Conversion rate (Enrolled / Leads × 100) |
| **# Campagne** | Number of campaigns per platform |

### 6.3 Filters

| Filter | Description |
|--------|-------------|
| **Corso** | Filter campaigns by associated course |
| **Piattaforma** | Focus on a single platform |
| **Data Inizio / Fine** | Date range for pro-rata spend calculation |

### 6.4 Visualizations

1. **Pie Chart** - Spend distribution across platforms
2. **Bar Chart** - Leads and enrollments by platform
3. **Horizontal Bar** - CPL comparison across platforms
4. **Expandable Cards** - Per-platform detail with campaign breakdown

### 6.5 Access

| Role | Access |
|------|--------|
| ADMIN | `/admin/platforms` |
| MARKETING | `/marketing/platforms` |
| COMMERCIAL | No access |

---

## 7. Lead Status Flow

### 7.1 Overview

Lead status is **automatically calculated** based on actions - it is never set directly. This ensures data integrity and prevents manual status manipulation.

### 7.2 Status Transitions

| From | To | Trigger |
|------|----|---------|
| `NUOVO` | `CONTATTATO` | Lead is contacted (call logged) |
| `CONTATTATO` | `IN_TRATTATIVA` | Lead marked as target (`isTarget = true`) |
| `IN_TRATTATIVA` | `ISCRITTO` | Lead enrolled (`enrolled = true`) |
| Any | `PERSO` | NEGATIVO outcome, 8 failed calls, or 15 days inactive |

### 7.3 Read-Only Kanban Boards

Kanban boards (Pipeline pages) are **display-only**:
- No drag-and-drop status changes
- Status columns show current state
- Click to view/edit lead details
- Actions (contact, enroll) change status automatically

### 7.4 Why Read-Only?

1. **Data Integrity** - Status reflects actual actions taken
2. **Accurate Reporting** - Metrics based on real funnel progression
3. **Audit Trail** - All transitions logged via LeadActivity

---

## 8. Lead Deletion

### 8.1 Overview

Lead deletion is protected by multiple safeguards to prevent accidental data loss. Only ADMIN users can delete leads.

### 8.2 Single Lead Deletion

**Component:** `src/components/ui/DeleteLeadModal.tsx`

Process:
1. User clicks delete button on lead
2. Modal shows lead details (name, course, status, call history)
3. **Type-to-confirm:** User must type "ELIMINA" exactly
4. Extra warning for high-value leads (IN_TRATTATIVA, ISCRITTO, or isTarget)
5. Irreversible deletion

### 8.3 Bulk Lead Deletion

**Component:** `src/components/ui/BulkDeleteModal.tsx`

Process:
1. User selects multiple leads via checkboxes
2. Clicks bulk delete button
3. Modal shows count and warns about high-value leads
4. **Type-to-confirm:** User must type "ELIMINA" exactly
5. Shows breakdown: X standard leads, Y high-value leads
6. Irreversible deletion

### 8.4 Who Can Delete

| Role | Single Delete | Bulk Delete |
|------|---------------|-------------|
| ADMIN | ✅ Yes | ✅ Yes |
| COMMERCIAL | ❌ No | ❌ No |
| MARKETING | ❌ No | ❌ No |

### 8.5 High-Value Lead Warnings

Extra confirmation required when deleting leads with:
- Status: `IN_TRATTATIVA` or `ISCRITTO`
- Flag: `isTarget = true`
- Recent activity (contacted within 7 days)

---

## 9. Revenue & ROI Tracking

### 9.1 Revenue Sources (Priority Order)

```typescript
const revenue = lead.revenue > 0 ? lead.revenue : course.price;
```

1. **Lead-specific revenue** (`lead.revenue`) - for custom pricing/discounts
2. **Course price fallback** (`course.price`) - standard pricing

### 9.2 When Revenue is Recognized

- Revenue is attributed by **enrolledAt** date (not createdAt)
- Only `enrolled: true` leads contribute to revenue

### 9.3 ROI Formula

```
ROI % = ((Total Revenue - Total Spend) / Total Spend) * 100
```

### 9.4 Cost Metrics

| Metric | Formula |
|--------|---------|
| CPL (Cost Per Lead) | totalSpent / totalLeads |
| Cost Per Consulenza | totalSpent / contactedLeads |
| Cost Per Contratto | totalSpent / enrolledLeads |

---

## 10. User Roles & Permissions

### 10.1 Role Access Matrix

| Feature | ADMIN | COMMERCIAL | MARKETING |
|---------|:-----:|:----------:|:---------:|
| View all leads | Yes | Own only | Campaign only |
| Create leads | Yes | Yes | Yes |
| Delete leads | Yes | No | No |
| Manage users | Yes | No | No |
| Create campaigns | Yes | No | Yes |
| Manage spend | Yes | No | Own campaigns |
| View performance stats | Yes | **No** | Yes |
| View conversion rates | Yes | **No** | Yes |
| View charts/analytics | Yes | **No** | Yes |
| View goals/revenue | Yes | **No** | Yes |

### 10.2 Commercial Role Restrictions (IMPORTANT)

**Commercials NO LONGER have access to:**
- Stats page (removed from navigation)
- Conversion rates
- Enrollment counts/percentages
- Performance charts (Funnel, Line, Pie)
- Goals and revenue targets
- Month-over-month comparisons

**Commercials CAN see:**
- Lead counts (assigned, contacted today)
- Callback pendenti (tasks)
- Lead target da contattare
- Leads needing attention
- Activity timeline
- Call attempt tracking (X/8)

### 10.3 Navigation by Role

**ADMIN:**
- Dashboard, Dashboard Excel, Users, Courses, Campaigns
- All Leads, Pipeline, Reports, Sanity Check, Settings

**COMMERCIAL:**
- Dashboard, I Miei Lead, Pipeline
- Promemoria, Corsi, Guida e FAQ

**MARKETING:**
- Dashboard, Campaigns, Leads by Campaign
- Costs, ROI & Performance

### 10.4 Route Protection

| Route | Allowed Roles |
|-------|---------------|
| `/admin/*` | ADMIN only |
| `/commercial/*` | ADMIN, COMMERCIAL |
| `/marketing/*` | ADMIN, MARKETING |

---

## 11. Forms & Data Entry

### 11.1 Lead Forms

| Form | Location | Required Fields |
|------|----------|-----------------|
| Create Lead | Admin/Commercial | name, courseId, campaignId |
| Edit Lead | Admin/Commercial | (all optional) |
| Call Outcome Modal | Lead toggle/button | callOutcome (required) |

### 11.2 Call Outcome Modal

When marking lead as contacted:
1. Shows attempt number ("Tentativo #X di 8")
2. Shows remaining attempts
3. Shows last call date and days until auto-PERSO
4. Requires outcome selection
5. Optional notes field
6. Warning at 8th attempt

### 11.3 Campaign Forms

| Form | Location | Required Fields |
|------|----------|-----------------|
| Create Campaign | Marketing | name, platform, courseId |
| Edit Campaign | Marketing | (all optional) |
| Add Spend Record | Campaign Modal | startDate, amount |

### 11.4 Import System

> **Full documentation:** See `docs/GUIDA_IMPORTAZIONE_LEAD.md`

**File Formats:** CSV, Excel (.xlsx, .xls)

**5-Step Wizard:**
1. **Upload** - Drag/drop or select file
2. **Mapping** - Map columns to lead fields
3. **Preview** - Review first 5 leads
4. **Corrections** - Fix unmatched courses/commercials (if any)
5. **Import** - Execute with corrections applied

**Validation Layers:**

| Layer | What It Checks | Action |
|-------|----------------|--------|
| Structure | Correct template format, required fields | Blocks import |
| Fuzzy Matching | Unknown courses/commercials | Shows interactive corrections |
| Data Quality | Missing contact info | Warns but allows |

**Fuzzy Matching Corrections:**

When courses or commercials don't match existing data, users can:
- Create new (courses only)
- Select an existing match (with similarity %)
- Leave unassigned (commercials only)

**Key Features:**
- Auto-mapping column names (Italian/English)
- Auto-creates campaigns if not found ("Import - {CourseName}")
- Batch processing (50 leads per batch)
- LLM instructions for data format conversion
- Template CSV download

---

## 12. API Reference

### 12.1 Lead APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/leads` | GET | List leads (with auto-cleanup) |
| `/api/leads` | POST | Create lead |
| `/api/leads/[id]` | GET | Get single lead |
| `/api/leads/[id]` | PUT | Update lead (call tracking) |
| `/api/leads/[id]` | DELETE | Delete lead (Admin only) |
| `/api/leads/bulk` | POST | Bulk operations |
| `/api/leads/import` | POST | Import leads (with structure validation) |
| `/api/leads/import/validate` | POST | Validate & fuzzy match before import |
| `/api/leads/template` | GET | Download CSV template |

### 12.2 GET /api/leads Query Parameters

| Param | Description |
|-------|-------------|
| `courseId` | Filter by course |
| `campaignId` | Filter by campaign |
| `assignedToId` | Filter by assigned user |
| `status` | Filter by lead status |
| `contacted` | Filter by contacted (true/false) |
| `enrolled` | Filter by enrolled (true/false) |
| `search` | Search name/email/phone |
| `source` | Filter by source (comma-separated) |
| `startDate` | Filter createdAt >= date |
| `endDate` | Filter createdAt <= date |

**Side Effect:** Triggers `autoCleanupStaleLeads()` on every GET

### 12.3 PUT /api/leads/[id] - Call Tracking

When `callOutcome` is provided:
1. Increments `callAttempts`
2. Sets `lastAttemptAt` to now
3. Sets `firstAttemptAt` if null
4. Creates `LeadActivity` with type `CALL`
5. Checks auto-PERSO rules

### 12.4 Activity Types

| Type | When Logged |
|------|-------------|
| `CALL` | Each call attempt with outcome |
| `CONTACT` | First successful contact |
| `STATUS_CHANGE` | Status transitions |
| `ASSIGNMENT` | Lead reassigned |
| `ENROLLMENT` | Lead enrolled |
| `LEAD_CREATED` | Lead created |
| `NOTE` | Manual notes |

---

## Appendix: Key File Locations

| Purpose | File |
|---------|------|
| Lead API | `src/app/api/leads/route.ts` |
| Lead Update API | `src/app/api/leads/[id]/route.ts` |
| Auto-Cleanup | `src/app/api/leads/route.ts` (autoCleanupStaleLeads) |
| Import API | `src/app/api/leads/import/route.ts` |
| Import Validation API | `src/app/api/leads/import/validate/route.ts` |
| Import Template API | `src/app/api/leads/template/route.ts` |
| Import UI (Modal) | `src/components/ui/ImportModal.tsx` |
| Import Parser | `src/lib/import.ts` |
| Campaign API | `src/app/api/campaigns/route.ts` |
| Stats API | `src/app/api/stats/route.ts` |
| Pro-rata Calc | `src/lib/spendProRata.ts` |
| Auth Config | `src/lib/auth.ts` |
| Middleware | `src/middleware.ts` |
| Prisma Schema | `prisma/schema.prisma` |
| Commercial Dashboard | `src/app/(dashboard)/commercial/page.tsx` |
| Commercial Leads | `src/app/(dashboard)/commercial/leads/page.tsx` |
| Commercial Pipeline | `src/app/(dashboard)/commercial/pipeline/page.tsx` |
| Sidebar Config | `src/components/ui/Sidebar.tsx` |
| Platform Constants | `src/lib/platforms.ts` |
| Platform Analytics (Marketing) | `src/app/(dashboard)/marketing/platforms/page.tsx` |
| Platform Analytics (Admin) | `src/app/(dashboard)/admin/platforms/page.tsx` |
| Delete Lead Modal | `src/components/ui/DeleteLeadModal.tsx` |
| Bulk Delete Modal | `src/components/ui/BulkDeleteModal.tsx` |
