# CLAUDE.md - Lead Management CRM

## Project Overview

A CRM for managing leads, courses, and marketing campaigns for Job Formazione. Built with Next.js 14 (App Router), Prisma, PostgreSQL (Supabase), and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js
- **UI**: Tailwind CSS, Lucide icons, Recharts

## Commands

```bash
npm run dev          # Development server
npm run build        # Build (runs prisma generate first)
npm run lint         # ESLint
npm run db:push      # Push schema to database
npm run db:seed      # Seed database
npm run db:studio    # Prisma Studio
```

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/       # Role-based pages (admin/, commercial/, marketing/)
│   ├── api/               # API routes
│   └── login/             # Auth pages
├── components/
│   ├── charts/            # Recharts components
│   └── ui/                # Reusable components
├── contexts/              # React contexts (DataFilterContext)
├── lib/                   # Utilities and constants
└── types/                 # TypeScript types
```

## Key Concepts

### User Roles
- `admin` - Full access
- `commercial` - Lead management, no performance stats
- `marketing` - Campaign management, ROI analysis

### Lead Status (Calculated, Read-Only)
Status is **automatically calculated** based on actions, never set directly:
- `NUOVO` → `CONTATTATO` (when contacted)
- `CONTATTATO` → `IN_TRATTATIVA` (when marked as target)
- `IN_TRATTATIVA` → `ISCRITTO` (when enrolled) or `PERSO` (when lost)

**Kanban boards are read-only** - no drag-drop status changes.

### Tri-State Fields
Lead fields use `TriState = 'SI' | 'NO' | 'ND'`:
- `contattatoStato` - Contacted status
- `targetStato` - Target status
- `iscrittoStato` - Enrolled status

### Call Tracking
- Max 8 call attempts per lead
- Outcomes: `POSITIVO`, `RICHIAMARE`, `NEGATIVO`
- Auto-PERSO: NEGATIVO outcome, 8 RICHIAMARE, or 15 days without contact

## Critical Rules

### 1. Platform Constants - ALWAYS Import from `@/lib/platforms`

**File**: `src/lib/platforms.ts`

**NEVER define local platform constants.** Always import from this centralized file:

```typescript
import {
  Platform,
  PLATFORMS,
  DEFAULT_PLATFORM,
  PLATFORM_LABELS,
  PLATFORM_LABELS_SHORT,
  PLATFORM_COLORS,        // Tailwind classes for badges
  PLATFORM_CHART_COLORS,  // Hex values for charts
  PLATFORM_OPTIONS,       // For select dropdowns
  PLATFORM_FILTER_OPTIONS,// Includes "all" option
  getPlatformLabel,
  getPlatformColor,
  getPlatformChartColor,
  isValidPlatform,
} from "@/lib/platforms";
```

Available platforms: `META`, `GOOGLE_ADS`, `LINKEDIN`, `TIKTOK`

### 2. Lead Deletion with Safeguards

Two deletion modals with type-to-confirm pattern:

- **Single lead**: `src/components/ui/DeleteLeadModal.tsx`
- **Bulk delete**: `src/components/ui/BulkDeleteModal.tsx`

Safeguards:
- User must type "ELIMINA" to confirm
- Extra warning for high-value leads (`IN_TRATTATIVA`, `ISCRITTO`, or target)
- Shows lead details and call history before deletion
- Irreversible action with clear messaging

### 3. Status is Calculated, Not Set

Lead status transitions are driven by actions, not direct edits:
1. New lead → `NUOVO`
2. Contact logged → `CONTATTATO`
3. Marked as target → `IN_TRATTATIVA`
4. Enrolled → `ISCRITTO` / Lost → `PERSO`

### 4. Analisi Piattaforme (Read-only)

- Pagine: `/marketing/platforms` e `/admin/platforms`
- Usa solo dati esistenti di `CampaignSpend` (via `/api/campaigns`), nessun nuovo dato salvato
- Filtri: corso, piattaforma, intervallo date
- Metriche: spesa, lead, iscritti, CPL, conversione, #campagne; dettaglio campagne per piattaforma

### 5. AI Analytics (Admin Only)

- Page: `/admin/ai-analytics`
- Uses **multi-provider AI routing** with automatic fallback
- **FREE models** from Groq and OpenRouter (no cost to users)
- Server-side API keys - no user authentication to AI providers needed
- Intelligent fallback: tries smartest model first, falls back on rate limits

**Providers (in priority order):**
1. **OpenRouter** - DeepSeek R1, Chimeras, Kimi K2, Llama 405B (all free)
2. **Groq** - Kimi K2, GPT-OSS-120B, Llama 3.3 70B (free tier with limits)

**Model Priority (Intelligence-first):**
```
R1 → Chimeras → Kimi (Groq) → Kimi (Free) → 405B → GPT-OSS → 70B → 8B
```

**Environment Variables:**
```bash
GROQ_API_KEY=gsk_...           # Free at console.groq.com
OPENROUTER_API_KEY=sk-or-...   # Free at openrouter.ai/keys
```

**Files:**
- `src/lib/ai-providers/config.ts` - Model and provider configuration
- `src/lib/ai-providers/router.ts` - Smart routing with fallback logic
- `src/lib/ai-providers/index.ts` - Main exports
- `src/app/api/codex/query/route.ts` - AI query endpoint (POST) and status (GET)
- `src/app/(dashboard)/admin/ai-analytics/page.tsx` - Admin UI

**Features:**
- Automatic rate limit detection and exponential backoff
- Fallback to next-smartest model when rate limited
- Shows which model was used for each response
- No user configuration needed - works out of the box

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/platforms.ts` | Centralized platform constants |
| `src/lib/ai-providers/` | Multi-provider AI system (Groq, OpenRouter) |
| `src/lib/ai-providers/config.ts` | Model configs and intelligence rankings |
| `src/lib/ai-providers/router.ts` | Smart routing with rate limit handling |
| `src/app/(dashboard)/marketing/platforms/page.tsx` | Analisi piattaforme (marketing, read-only) |
| `src/app/(dashboard)/admin/platforms/page.tsx` | Analisi piattaforme (admin, read-only) |
| `src/app/(dashboard)/admin/ai-analytics/page.tsx` | AI Analytics (admin-only) |
| `src/lib/auth.ts` | NextAuth configuration |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/types/index.ts` | TypeScript type definitions |
| `src/contexts/DataFilterContext.tsx` | Global date/filter state |
| `prisma/schema.prisma` | Database schema |

## Documentation

- `docs/SYSTEM_DOCUMENTATION.md` - Full system docs
- `docs/CAMPAIGN_SPEND_TECHNICAL.md` - Spend tracking details
- `docs/GUIDA_GESTIONE_SPESE.md` - User guide (Italian)
