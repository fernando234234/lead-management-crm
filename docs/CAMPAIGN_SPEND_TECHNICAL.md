# Campaign Spend Tracking - Technical Documentation

> Last updated: January 2026

---

## Overview

The campaign spend tracking system allows multi-period cost tracking for marketing campaigns. Instead of a single `budget` field, campaigns now use a separate `CampaignSpend` model with date ranges.

---

## Data Model

### Prisma Schema

```prisma
model CampaignSpend {
  id         String    @id @default(cuid())
  campaignId String
  campaign   Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  startDate  DateTime  @db.Date
  endDate    DateTime? @db.Date
  amount     Decimal   @db.Decimal(10, 2)
  notes      String?
  createdAt  DateTime  @default(now())

  @@unique([campaignId, startDate])
  @@index([campaignId])
  @@index([startDate])
}
```

### Key Points
- `startDate` is required, `endDate` is optional (null = ongoing)
- `amount` uses Decimal for precision
- Unique constraint on `[campaignId, startDate]` prevents duplicate entries
- `onDelete: Cascade` removes spend records when campaign is deleted

---

## API Endpoints

### GET /api/campaigns/[id]/spend

Fetch spend records for a campaign.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | ISO date | Filter records overlapping from this date |
| `endDate` | ISO date | Filter records overlapping until this date |

**Response:**
```json
{
  "records": [
    {
      "id": "cuid",
      "campaignId": "cuid",
      "startDate": "2026-01-01",
      "endDate": "2026-01-31",
      "amount": "1500.00",
      "notes": "January budget",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "total": 1500.00
}
```

---

### POST /api/campaigns/[id]/spend

Create a new spend record.

**Request Body:**
```json
{
  "startDate": "2026-02-01",
  "endDate": "2026-02-28",
  "amount": 2000,
  "notes": "February budget"
}
```

**Validation:**
- `startDate` required
- `amount` required, must be >= 0
- `endDate` must be >= `startDate` if provided

---

### PUT /api/campaigns/[id]/spend?spendId=xxx

Update an existing spend record.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `spendId` | string | Required - ID of the spend record to update |

**Request Body:** Same as POST

---

### DELETE /api/campaigns/[id]/spend?spendId=xxx

Delete a spend record.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `spendId` | string | Required - ID of the spend record to delete |

---

### GET /api/campaigns

Fetch campaigns with date-filtered spend totals.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `spendStartDate` | ISO date | Filter spend from this date |
| `spendEndDate` | ISO date | Filter spend until this date |

**Response includes:**
```json
{
  "id": "cuid",
  "name": "Campaign Name",
  "totalSpent": 5300.00,
  "spendRecords": [...],
  "metrics": {
    "totalLeads": 100,
    "costPerLead": "53.00"
  }
}
```

---

### GET /api/stats

Dashboard statistics with date-filtered financials.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | ISO date | Filter from this date |
| `endDate` | ISO date | Filter until this date |

**Date filtering applies to:**
- Lead counts (by `createdAt`)
- Revenue (from enrolled leads in period)
- Costs (from spend records overlapping period)

---

## Date Overlap Logic

When filtering spend records by date range, we use **overlap logic**:

```sql
-- Record is included if its period overlaps with the filter period
WHERE (endDate IS NULL OR endDate >= filterStart)
  AND startDate <= filterEnd
```

**Example:**
- Filter: Jan 15 - Feb 15
- Record: Jan 1 - Jan 31 → **Included** (overlaps)
- Record: Feb 1 - Feb 28 → **Included** (overlaps)
- Record: Mar 1 - Mar 31 → **Excluded** (no overlap)

---

## UI Components

### SpendRecordList
`src/components/ui/SpendRecordList.tsx`

Table component displaying spend records with edit/delete actions.

```tsx
<SpendRecordList
  records={spendRecords}
  isLoading={loading}
  onEdit={(record) => openEditModal(record)}
  onDelete={(id) => handleDelete(id)}
  emptyStateText="No spend records"
/>
```

### SpendRecordForm
`src/components/ui/SpendRecordForm.tsx`

Form for creating/editing spend records.

```tsx
<SpendRecordForm
  initialData={editingRecord}
  onSubmit={handleSave}
  onCancel={closeModal}
  isLoading={saving}
/>
```

### SpendRecordModal
`src/components/ui/SpendRecordModal.tsx`

Modal wrapper for SpendRecordForm.

```tsx
<SpendRecordModal
  isOpen={showModal}
  onClose={closeModal}
  onSave={handleSave}
  record={editingRecord}
/>
```

---

## Migration from Legacy Budget

The legacy `budget` field on Campaign is deprecated. Migration was done via:

1. Create `CampaignSpend` record for each campaign with existing budget
2. Set `startDate` to campaign's `startDate`
3. Set `amount` to campaign's `budget` value
4. Set `budget` to 0 on Campaign

**Current state:**
- `Campaign.budget` exists but is always 0
- All spend tracking uses `CampaignSpend` records
- `totalSpent` is calculated by summing `spendRecords`

---

## Calculating Metrics

### Total Spent (per campaign)
```typescript
const totalSpent = campaign.spendRecords.reduce(
  (sum, record) => sum + Number(record.amount),
  0
);
```

### Cost Per Lead
```typescript
const cpl = totalLeads > 0 ? totalSpent / totalLeads : 0;
```

### ROI
```typescript
const roi = totalSpent > 0 
  ? ((revenue - totalSpent) / totalSpent) * 100 
  : 0;
```

---

## File Structure

```
src/
├── app/api/campaigns/[id]/spend/
│   └── route.ts          # GET, POST, PUT, DELETE endpoints
├── components/ui/
│   ├── SpendRecordList.tsx
│   ├── SpendRecordForm.tsx
│   └── SpendRecordModal.tsx
└── app/(dashboard)/
    ├── marketing/
    │   ├── campaigns/page.tsx  # Spend management tab
    │   ├── costs/page.tsx      # Date filter
    │   └── roi/page.tsx        # Date filter + trend chart
    └── admin/
        ├── page.tsx            # Dashboard with date filter
        └── reports/page.tsx    # Reports with date filter
```

---

## Database Queries

### Get campaigns with filtered spend
```typescript
const campaigns = await prisma.campaign.findMany({
  include: {
    spendRecords: {
      where: {
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: startDate } }] },
          { startDate: { lte: endDate } }
        ]
      }
    }
  }
});
```

### Aggregate total spend
```typescript
const total = await prisma.campaignSpend.aggregate({
  where: { campaignId },
  _sum: { amount: true }
});
```

---

## Testing

### Validation Checks
Run the validation script before deployment:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function validate() {
  // Check for orphaned records
  const orphans = await prisma.campaignSpend.findMany({
    where: { campaign: null }
  });
  
  // Check date consistency
  const invalid = await prisma.campaignSpend.findMany({
    where: {
      endDate: { not: null },
      startDate: { gt: prisma.campaignSpend.fields.endDate }
    }
  });
  
  console.log('Orphans:', orphans.length);
  console.log('Invalid dates:', invalid.length);
}
validate();
"
```

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `Spend record not found` | Invalid spendId | Check ID exists |
| `endDate must be >= startDate` | Date validation | Fix date order |
| `Campaign not found` | Invalid campaignId | Verify campaign exists |
| `Unauthorized` | Permission denied | Check user role |

---

## Performance Considerations

- Indexes on `campaignId` and `startDate` for fast queries
- Spend records included in campaign queries (N+1 avoided)
- Date filtering done at database level, not in memory
