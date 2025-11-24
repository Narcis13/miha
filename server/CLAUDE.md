# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a payment management system built on the "bhvr" monorepo stack. The application manages beneficiaries, payment packages, and payments with SQLite as the database. It's a Romanian-language application for managing pension or social benefit payments.

The system handles:
- Beneficiaries (pensionari) with Romanian CNP validation and IBAN validation
- Payment packages (pachete de plăți) with date and observations
- Individual payments linked to beneficiaries and packages
- Institution settings (CUI, bank info, program codes)

## Commands

### Development
```bash
# From monorepo root (/home/sysadm/miha/):
bun run dev              # Run all workspaces (client, server, shared)
bun run dev:server       # Run only the server with hot reload
bun run dev:client       # Run only the client

# From server directory:
bun --watch run src/index.ts  # Run server with hot reload
```

### Build
```bash
# From monorepo root:
bun run build            # Build all workspaces
bun run build:server     # Build only the server
bun run build:client     # Build only the client

# From server directory:
bun run build            # Compile TypeScript to dist/
```

### Data Import
```bash
# From server directory:
bun run import:beneficiaries ../pensionari.csv
```

### Deployment
```bash
# Production deployment (see DEPLOYMENT.md):
cd /var/www/miha
bun install
bun run build:client
bun run server/src/index.ts  # Or use systemd service
```

### Other
```bash
bun run lint             # Lint all workspaces
bun run type-check       # Type check all workspaces
```

## Architecture

### Monorepo Structure
This is a Bun workspace monorepo orchestrated by Turbo:
- **server/**: Hono API server (this directory) - port 3765
- **client/**: React + Vite frontend with TanStack Router
- **shared/**: Shared TypeScript types (currently minimal usage)

The server also serves the built client SPA from `client/dist/` at runtime.

### Server Architecture (Hono + SQLite)

**Database**: Single SQLite file (`beneficiaries.sqlite`) with 4 tables:
- `beneficiaries`: CNP (Romanian personal ID), name, IBAN, observations
- `pachete_plati`: Payment packages with date and observations
- `plati`: Individual payments (FK to package + beneficiary), amount, case number
- `institution_settings`: Singleton settings row (id=1)

**API Endpoints** (`src/index.ts`):
- `/beneficiaries` - CRUD with search/pagination
- `/payment-packages` - CRUD with date filtering
- `/payments` - CRUD, must query by `packageId`
- `/settings` - GET/PUT singleton institution settings
- `/*` - Serves client SPA (fallback routing for TanStack Router)

**Validation Functions** (in both `src/index.ts` and `src/import_beneficiaries.ts`):
- `isValidCNP(cnp)`: Romanian 13-digit CNP with check digit
- `isValidIBAN(iban)`: Romanian IBAN format (RO + 22 chars) with mod-97 validation

**CSV Import** (`src/import_beneficiaries.ts`):
- Custom CSV parser supporting quoted fields
- Upserts beneficiaries by CNP (updates existing, inserts new)
- Validates CNP and IBAN before import

### Client Architecture

**Routing**: TanStack Router (file-based)
- Routes defined in `client/src/routes/`
- Generated route tree in `routeTree.gen.ts`

**Components** (`client/src/components/`):
- `BeneficiariesList.tsx`: Main beneficiaries management
- `PaymentPackages.tsx`: Payment package list and management
- `PaymentsList.tsx`: Payments within a package
- `InstitutionSettings.tsx`: Institution configuration
- `PaymentApp.tsx`: Root component with tabs
- `ui/`: shadcn/ui components (button, input, dialog, etc.)

**State Management**: React hooks with direct API calls (no global state library)

**Styling**: Tailwind CSS 4.x with Radix UI primitives

### Type Sharing

The `shared` package exports types (though currently minimal). To add shared types:
1. Define in `shared/src/types/index.ts`
2. Export in `shared/src/index.ts`
3. Build: `bun run build --filter=shared`
4. Import in client/server: `import { Type } from 'shared'`

Path aliases in `tsconfig.json`:
- `@server/*` → `server/src/*`
- `@client/*` → `client/src/*`
- `@shared/*` → `shared/src/*`

## Important Patterns

### Romanian Validation
Always use the existing validation functions for CNP and IBAN. Do not create simplified versions.

### Database Operations
- All DB operations use `bun:sqlite` with prepared statements via `.query()`
- Use transactions for bulk operations: `db.run('BEGIN')` ... `db.run('COMMIT')`
- Foreign keys are enabled: `PRAGMA foreign_keys = ON`

### API Response Format
Standard patterns:
- Success: `c.json(data)` or `c.json(data, 201)`
- Error: `c.json({ error: 'message' }, statusCode)`
- Pagination: `c.json({ items, total, limit, offset })`

### Server-Served SPA
The server serves the built client at runtime. After client changes:
1. Build client: `bun run build:client`
2. Server automatically serves from `client/dist/`

### Hot Reload
Use `bun --watch` for server hot reload during development. Turbo's `dev` task handles this in the monorepo.

## Notes

- Server runs on port **3765** (configured in `src/index.ts` export)
- All money amounts are stored as integers (cents/bani) in `plati.suma`
- CNP must be exactly 13 digits with valid check digit
- IBAN must be Romanian format (RO + 22 alphanumeric)
- CUI (institution tax ID) must be 6+ digits
- The `postinstall` script automatically builds `shared` and `server` after `bun install`
