# Lead Management CRM

CRM per Job Formazione: Next.js 14 (App Router), TypeScript, Prisma (PostgreSQL/Supabase), NextAuth, Tailwind, Recharts.

## Features (Sintesi)
- Status lead **calcolato e read-only** (NUOVO → CONTATTATO → IN_TRATTATIVA → ISCRITTO/PERSO)
- Costi e ROI per campagna; analisi piattaforme aggregata (solo lettura) da CampaignSpend
- Eliminazione lead con conferma "ELIMINA" (singola e bulk) e avvisi su lead di valore
- Costi per campagna con filtri e export
- Dashboard marketing/admin

## Tech Stack
- Next.js 14 (App Router), TypeScript
- Prisma + PostgreSQL (Supabase)
- NextAuth.js
- Tailwind CSS, Lucide Icons, Recharts

## Default Accounts (seed)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@leadcrm.it | admin123 |
| Commercial | commerciale@leadcrm.it | user123 |
| Marketing | marketing@leadcrm.it | user123 |

## Project Structure (parziale)
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── admin/               # Admin pages
│   │   │   └── platforms/       # Analisi piattaforme (read-only)
│   │   ├── commercial/          # Commercial pages
│   │   └── marketing/           # Marketing pages
│   │       └── platforms/       # Analisi piattaforme (read-only)
│   ├── api/                     # API routes
│   │   └── campaigns/[id]/spend # Campaign spend endpoints
│   ├── login/                   # Login page
│   └── page.tsx                 # Homepage
├── components/
│   ├── charts/                  # Recharts components
│   └── ui/                      # Reusable UI components
│       ├── DeleteLeadModal.tsx  # Lead deletion with safeguards
│       └── BulkDeleteModal.tsx  # Bulk lead deletion
├── contexts/                    # React contexts
├── lib/
│   └── platforms.ts             # Centralized platform constants (single source of truth)
└── types/
```

docs/
- SYSTEM_DOCUMENTATION.md
- CAMPAIGN_SPEND_TECHNICAL.md
- GUIDA_GESTIONE_SPESE.md
- DATA_IMPORT_DECISIONS.md

## Key Conventions
- **Platform constants centralizzati**: importare sempre da `@/lib/platforms`
- **Status lead read-only**: derivato da azioni, no drag-drop
- **Analisi Piattaforme**: `/marketing/platforms` e `/admin/platforms` sono solo lettura, aggregano `CampaignSpend` tramite `/api/campaigns`, filtri per corso/pattaforma/date
- **Cancellazione lead**: conferma "ELIMINA" e avvisi per lead di valore

## Scripts
```bash
npm run dev       # Dev server
npm run build     # Build prod
npm run start     # Start prod
npm run lint      # ESLint
npx prisma db push # Sync schema
npx prisma studio # Prisma Studio
```

## License
MIT
