# Lead Management CRM

A complete CRM solution for managing leads, courses, and marketing campaigns. Built with Next.js 14, Prisma, PostgreSQL (Supabase), and Tailwind CSS.

![Lead Management CRM](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat-square&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)

## Features

### User Roles
- **Admin**: Full access to all features including user management, reports, and settings
- **Commercial**: Lead management, pipeline tracking, tasks, and personal statistics
- **Marketing**: Campaign management, cost tracking, ROI analysis

### Key Features
- Dashboard with real-time statistics and charts
- Lead management with status tracking (Nuovo, Contattato, In Trattativa, Iscritto, Perso)
- Kanban pipeline view for visual lead management
- Campaign management with spend tracking
- Course management
- Activity timeline for leads
- Bulk actions (assign, update status, delete)
- Import/Export functionality (CSV, Excel)
- In-app notifications
- Task/reminder system
- Global search
- Demo mode with mock data

### UI Features
- Red/White theme inspired by Job Formazione
- Responsive design for mobile and desktop
- Skeleton loading states
- Empty state handling
- Tooltips and help icons
- Accessible components with ARIA labels

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Export**: xlsx library

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase recommended)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/fernando234234/lead-management-crm.git
cd lead-management-crm
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with:
```env
DATABASE_URL="your-postgresql-connection-string"
DIRECT_URL="your-direct-connection-string"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

5. Push the database schema:
```bash
npx prisma db push
```

6. (Optional) Seed the database:
```bash
npx prisma db seed
```

7. Start the development server:
```bash
npm run dev
```

## Deploy on Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/fernando234234/lead-management-crm&env=DATABASE_URL,DIRECT_URL,NEXTAUTH_SECRET,NEXTAUTH_URL)

### Manual Deploy

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your repository
3. Configure the following environment variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (pooled) |
| `DIRECT_URL` | PostgreSQL direct connection string |
| `NEXTAUTH_SECRET` | Secret key for NextAuth (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your production URL (e.g., `https://your-app.vercel.app`) |

4. Deploy!

### Supabase Setup

1. Create a new project on [Supabase](https://supabase.com)
2. Go to Project Settings > Database
3. Copy the connection strings:
   - **Connection string** (for `DATABASE_URL`)
   - **Direct connection** (for `DIRECT_URL`)

## Demo Accounts

After seeding the database, you can use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@leadcrm.it | admin123 |
| Commercial | marco.verdi@leadcrm.it | user123 |
| Marketing | giulia.rossi@leadcrm.it | user123 |

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── admin/          # Admin pages
│   │   ├── commercial/     # Commercial pages
│   │   └── marketing/      # Marketing pages
│   ├── api/                # API routes
│   ├── login/              # Login page
│   └── page.tsx            # Homepage
├── components/
│   ├── charts/             # Recharts components
│   └── ui/                 # Reusable UI components
├── contexts/               # React contexts
├── lib/                    # Utility functions
└── types/                  # TypeScript types
```

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
npx prisma studio # Open Prisma Studio
```

## License

MIT

## Author

Fernando - [GitHub](https://github.com/fernando234234)
