# SponsorSync

Automated sponsorship tracking and deadline management for solo creators.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL via Supabase |
| ORM | Drizzle ORM |
| Auth | NextAuth.js |
| Background Jobs | Inngest |
| Email | Resend |
| Testing | Vitest + Playwright |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- PostgreSQL (or Supabase account)

### Setup

1. **Clone and install:**

   ```bash
   git clone <repo-url> && cd sponsorsync
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your actual values.

3. **Set up the database:**

   ```bash
   npm run db:push
   ```

4. **Run the development server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Running Tests

```bash
# Unit + integration tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests (requires dev server running)
npm run test:e2e
```

### Linting & Type Checking

```bash
npm run lint
npm run typecheck
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, callback)
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API route handlers
├── components/            # React components
│   ├── ui/                # Reusable UI primitives
│   └── layout/            # Layout components
├── domain/                # Business logic modules
│   ├── deals/
│   ├── deliverables/
│   ├── payments/
│   └── deadlines/
├── lib/                   # Shared utilities and clients
│   ├── auth/              # NextAuth configuration
│   ├── config/            # App configuration
│   ├── db/                # Drizzle ORM client, schema, queries
│   ├── email/             # Email templates (Resend)
│   ├── inngest/           # Background job functions
│   ├── integrations/      # Third-party API clients
│   ├── security/          # Encryption utilities
│   └── utils/             # General utilities
├── middleware.ts          # Rate limiting + validation guard
└── __tests__/             # Test files
    ├── unit/
    └── integration/
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET/POST | `/api/deals` | List / create deals |
| GET/PATCH/DELETE | `/api/deals/:id` | Deal CRUD |
| GET/POST | `/api/sponsors` | List / create sponsors |
| GET/PATCH/DELETE | `/api/sponsors/:id` | Sponsor CRUD |
| GET/POST | `/api/deliverables` | List / create deliverables |
| GET/PATCH/DELETE | `/api/deliverables/:id` | Deliverable CRUD |
| GET/POST | `/api/payments` | List / create payments |
| GET/PATCH/DELETE | `/api/payments/:id` | Payment CRUD |
| GET/POST | `/api/templates` | List / create templates |
| GET/PATCH/DELETE | `/api/templates/:id` | Template CRUD |
| GET | `/api/integrations` | List integrations |
| POST | `/api/integrations/connect` | Connect platform |
| GET/DELETE | `/api/integrations/:platform` | Platform integration |
| GET | `/api/ical/:token` | Public .ics calendar feed |

## License

Private — All rights reserved.
