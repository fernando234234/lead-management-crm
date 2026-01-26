# Lead Management CRM - Complete System Documentation

**Generated:** January 2026  
**Version:** 1.0

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Lead Tracking System](#2-lead-tracking-system)
3. [Campaign & Spend Tracking](#3-campaign--spend-tracking)
4. [Revenue & ROI Tracking](#4-revenue--roi-tracking)
5. [Forms & Data Entry](#5-forms--data-entry)
6. [User Roles & Permissions](#6-user-roles--permissions)
7. [Consistency Analysis & Issues](#7-consistency-analysis--issues)
8. [Recommendations](#8-recommendations)

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

---

## 2. Lead Tracking System

### 2.1 Lead Data Model

```
Lead {
  id, name, email, phone
  courseId, campaignId
  assignedToId, createdById, contactedById
  status: NUOVO | CONTATTATO | IN_TRATTATIVA | ISCRITTO | PERSO
  source: MANUAL | CAMPAIGN | LEGACY_IMPORT
  contacted, contactedAt
  enrolled, enrolledAt
  isTarget, targetNote
  callOutcome, outcomeNotes
  acquisitionCost, revenue
  notes, createdAt, updatedAt
}
```

### 2.2 Lead Status Flow

```
NUOVO → CONTATTATO → IN_TRATTATIVA → ISCRITTO
                                   ↘ PERSO
```

### 2.3 Lead Visibility Rules

| Role | Can See |
|------|---------|
| ADMIN | All leads |
| COMMERCIAL | Leads assigned to them OR created by them |
| MARKETING | Leads from campaigns they created |

### 2.4 Key APIs

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/leads` | GET, POST | List/create leads |
| `/api/leads/[id]` | GET, PUT, DELETE | Single lead CRUD |
| `/api/leads/bulk` | POST | Bulk operations (Admin only) |
| `/api/leads/import` | POST | CSV/Excel import (Admin only) |

---

## 3. Campaign & Spend Tracking

### 3.1 Data Models

```
Campaign {
  id, name, platform, status
  courseId, createdById
  startDate, endDate
  budget (DEPRECATED - always 0)
  spendRecords[]
}

CampaignSpend {
  id, campaignId
  startDate, endDate
  amount, notes
}
```

### 3.2 Pro-Rata Spend Calculation

When filtering by date range, spend is attributed proportionally:

```
Pro-rata = amount × (overlapDays / totalDays)

Example:
- Spend: Jan 1 - Mar 31 (90 days), €1000
- Filter: February (28 days overlap)
- Pro-rata: €1000 × (28/90) = €311.11
```

**Implementation:** `src/lib/spendProRata.ts`

### 3.3 CPL Calculation (FIXED)

```
CPL = Pro-rata Spend / Leads Created in Same Period
```

Both numerator and denominator are now aligned to the same date range.

---

## 4. Revenue & ROI Tracking

### 4.1 Revenue Sources (Priority Order)

```typescript
const revenue = lead.revenue > 0 ? lead.revenue : course.price;
```

1. **Lead-specific revenue** (`lead.revenue`) - for custom pricing/discounts
2. **Course price fallback** (`course.price`) - standard pricing

### 4.2 When Revenue is Recognized

- Revenue is attributed by **enrolledAt** date (not createdAt)
- Only `enrolled: true` leads contribute to revenue

### 4.3 ROI Formula

```
ROI % = ((Total Revenue - Total Spend) / Total Spend) × 100
```

### 4.4 Cost Metrics

| Metric | Formula |
|--------|---------|
| CPL (Cost Per Lead) | totalSpent / totalLeads |
| Cost Per Consulenza | totalSpent / contactedLeads |
| Cost Per Contratto | totalSpent / enrolledLeads |

---

## 5. Forms & Data Entry

### 5.1 Lead Forms

| Form | Location | Required Fields |
|------|----------|-----------------|
| Create Lead | Admin/Commercial | name, courseId |
| Edit Lead | Admin/Commercial | (all optional) |
| Quick Note | Lead Detail Modal | note text |
| Log Call | Lead Detail Modal | call description |

### 5.2 Campaign Forms

| Form | Location | Required Fields |
|------|----------|-----------------|
| Create Campaign | Marketing | name, platform, courseId |
| Edit Campaign | Marketing | (all optional) |
| Add Spend Record | Campaign Modal | startDate, amount |

### 5.3 Import System

- **Formats:** CSV, Excel (.xlsx, .xls)
- **Auto-mapping:** Detects column names in Italian/English
- **Auto-creates:** Courses if not found
- **Batch size:** 50 leads per batch

---

## 6. User Roles & Permissions

### 6.1 Role Access Matrix

| Feature | ADMIN | COMMERCIAL | MARKETING |
|---------|-------|------------|-----------|
| View all leads | ✓ | Own only | Campaign only |
| Create leads | ✓ | ✓ | ✓ |
| Delete leads | ✓ | ✗ | ✗ |
| Manage users | ✓ | ✗ | ✗ |
| Create campaigns | ✓ | ✗ | ✓ |
| Manage spend | ✓ | ✗ | Own campaigns |
| View reports | ✓ | Own stats | Own campaigns |

### 6.2 Route Protection

| Route | Allowed Roles |
|-------|---------------|
| `/admin/*` | ADMIN only |
| `/commercial/*` | ADMIN, COMMERCIAL |
| `/marketing/*` | ADMIN, MARKETING |

---

## 7. Consistency Analysis & Issues

### ✅ CONSISTENT

1. **CPL Calculation** - Now properly aligned (spend period = lead period)
2. **Pro-rata Spend** - Correctly implemented in `spendProRata.ts`
3. **Role-based Visibility** - Consistent across all APIs
4. **Revenue Priority** - Consistent `lead.revenue || course.price` pattern

### ⚠️ POTENTIAL ISSUES FOUND

#### Issue 1: Revenue Date Filter Inconsistency

**Stats API** (`/api/stats`):
- Revenue filtered by `enrolledAt` date ✓

**Campaigns API** (`/api/campaigns`):
- Revenue filtered by `createdAt` via `leadDateFilter` ✗

```typescript
// campaigns/route.ts line 123-126
const enrolledLeads = await prisma.lead.findMany({
  where: { ...leadDateFilter, enrolled: true },  // Uses createdAt filter!
  select: { revenue: true },
});
```

**Impact:** Campaign revenue may include leads enrolled outside the filter period if they were created during it.

---

#### Issue 2: `lead.revenue` Field Not Settable via API

The Lead API doesn't explicitly handle `revenue` in request body:

```typescript
// leads/[id]/route.ts - revenue not in updateData mapping
```

**Impact:** Revenue can only be set via direct DB or import scripts.

---

#### Issue 3: `acquisitionCost` Field Unused

- Field exists on Lead model
- 0 of 6,876 leads have it set
- Bulk operations support setting it
- But CPL is calculated dynamically from campaign spend

**Impact:** None currently, but creates confusion about which system to use.

---

#### Issue 4: Goals Revenue Calculation

Goals use `lead.revenue` directly without course.price fallback:

```typescript
// Potential issue in goals calculation
const revenue = leads.reduce((sum, l) => sum + (l.revenue || 0), 0);
// Should be: sum + (l.revenue || l.course?.price || 0)
```

**Impact:** Goal progress shows 0 revenue for leads without explicit revenue set.

---

#### Issue 5: Enrollment Notification Missing Revenue

When lead is enrolled, notifications are sent but revenue isn't auto-populated:

```typescript
// No auto-set: lead.revenue = course.price on enrollment
```

**Impact:** Must manually set revenue for each enrollment if different from course price.

---

### 📊 Data Consistency Check

| Check | Status | Notes |
|-------|--------|-------|
| All leads have courseId | ✓ | Required field |
| All leads have valid status | ✓ | Enum enforced |
| Spend records have valid dates | ✓ | Constraint enforced |
| Campaign budget = 0 | ✓ | All use spendRecords |
| Lead.acquisitionCost populated | ✗ | 0/6,876 have values |
| Lead.revenue populated | ? | Need to check |

---

## 8. Recommendations

### High Priority

1. **Fix Campaign Revenue Filter**
   ```typescript
   // Should filter by enrolledAt, not createdAt
   const enrolledLeads = await prisma.lead.findMany({
     where: { 
       campaignId: campaign.id,
       enrolled: true,
       enrolledAt: dateFilter  // Use enrolledAt!
     },
   });
   ```

2. **Add revenue to Lead API**
   ```typescript
   // In leads/[id]/route.ts
   if (body.revenue !== undefined) {
     updateData.revenue = body.revenue;
   }
   ```

### Medium Priority

3. **Fix Goals Revenue Calculation** - Use course.price fallback

4. **Document the Two Cost Systems**
   - `lead.acquisitionCost` = per-lead (unused)
   - `CampaignSpend` = campaign level (active)
   
   Decision: Keep dynamic CPL, deprecate `acquisitionCost`

### Low Priority

5. **Consider auto-setting `lead.revenue = course.price` on enrollment**

6. **Add data validation script** to check revenue/enrollment consistency

---

## Appendix: Key File Locations

| Purpose | File |
|---------|------|
| Lead API | `src/app/api/leads/route.ts` |
| Campaign API | `src/app/api/campaigns/route.ts` |
| Stats API | `src/app/api/stats/route.ts` |
| Pro-rata Calc | `src/lib/spendProRata.ts` |
| Auth Config | `src/lib/auth.ts` |
| Middleware | `src/middleware.ts` |
| Prisma Schema | `prisma/schema.prisma` |
| Reports Page | `src/app/(dashboard)/admin/reports/page.tsx` |
