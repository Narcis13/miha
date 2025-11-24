# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A payment management system for Romanian pension/social benefits, built on the "bhvr" monorepo stack (Bun + Hono + Vite + React). The application manages beneficiaries with CNP/IBAN validation, payment packages, and individual payments using SQLite.

## Commands

### Development
```bash
# From monorepo root:
bun run dev              # Run all workspaces (client, server, shared) with hot reload
bun run dev:server       # Run only server with hot reload
bun run dev:client       # Run only client with hot reload

# From server directory:
bun --watch run src/index.ts  # Run server with hot reload directly
```

### Build
```bash
# From monorepo root:
bun run build            # Build all workspaces (shared, then server, then client)
bun run build:server     # Build only server (compiles TypeScript to dist/)
bun run build:client     # Build only client (outputs to client/dist/)
```

### Type Checking & Linting
```bash
bun run type-check       # Type check all workspaces
bun run lint             # Lint all workspaces
```

### Data Import
```bash
# From server directory:
bun run import:beneficiaries <path-to-csv>
# Example: bun run import:beneficiaries ../pensionari.csv
```

### Deployment
```bash
# Production deployment (see DEPLOYMENT.md for full details):
cd /var/www/miha
git pull
bun install              # Runs postinstall which builds shared and server
bun run build:client
sudo systemctl restart miha  # Or: bun run server/src/index.ts
```

## Architecture

### Monorepo Structure (Bun Workspaces + Turbo)
```
miha/
├── server/              # Hono API server (port 3765)
│   └── src/
│       ├── index.ts     # Main server file with all API routes
│       └── import_beneficiaries.ts
├── client/              # React + Vite + TanStack Router frontend
│   └── src/
│       ├── routes/      # File-based routing
│       ├── components/  # React components
│       └── lib/         # Utilities
├── shared/              # Shared TypeScript types between client/server
│   └── src/types/
└── package.json         # Root workspace config with Turbo orchestration
```

The server serves both the API and the built client SPA from `client/dist/` at runtime.

### Server Architecture (Hono + bun:sqlite)

**Database**: Single SQLite file (`beneficiaries.sqlite`) with 4 tables:
- `beneficiaries`: CNP (Romanian ID), name, IBAN, observations
- `pachete_plati`: Payment packages with date and observations
- `plati`: Individual payments (FK to package + beneficiary), amount in integer cents, case number
- `institution_settings`: Singleton config row (id=1) with CUI, bank info, program codes

**API Endpoints** (all defined in `server/src/index.ts`):
- `GET /beneficiaries?q=<search>&limit=<n>&offset=<n>` - Search with pagination
- `GET /beneficiaries/:id` - Get single beneficiary
- `POST /beneficiaries` - Create beneficiary (validates CNP/IBAN)
- `PUT /beneficiaries/:id` - Update beneficiary
- `DELETE /beneficiaries/:id` - Delete beneficiary
- `GET /payment-packages?startDate=<ts>&endDate=<ts>` - List packages with date filtering
- `GET /payment-packages/:id` - Get single package
- `POST /payment-packages` - Create package
- `PUT /payment-packages/:id` - Update package
- `DELETE /payment-packages/:id` - Delete package (cascade deletes payments)
- `GET /payments?packageId=<id>` - List payments for a package (packageId required)
- `POST /payments` - Create payment
- `PUT /payments/:id` - Update payment
- `DELETE /payments/:id` - Delete payment
- `GET /settings` - Get institution settings
- `PUT /settings` - Update institution settings
- `GET /*` - Serve client SPA (fallback for TanStack Router)

**Romanian Validation Functions** (in `server/src/index.ts` and `server/src/import_beneficiaries.ts`):
- `isValidCNP(cnp)`: 13-digit CNP with weighted checksum validation
- `isValidIBAN(iban)`: Romanian IBAN format (RO + 22 chars) with mod-97 algorithm

**CSV Import** (`server/src/import_beneficiaries.ts`):
- Custom CSV parser with quoted field support
- Upserts beneficiaries by CNP (updates if exists, inserts if new)
- Validates CNP and IBAN before import

### Client Architecture (React + Vite + TanStack Router)

**Routing**: TanStack Router with file-based routes in `client/src/routes/`
- `__root.tsx`: Root layout with devtools
- `index.tsx`: Main route rendering `PaymentApp`
- Auto-generated route tree in `routeTree.gen.ts`

**Key Components** (`client/src/components/`):
- `PaymentApp.tsx`: Root component with tabbed interface
- `BeneficiariesList.tsx`: Beneficiary CRUD with search/pagination
- `PaymentPackages.tsx`: Payment package list and management
- `PaymentsList.tsx`: Payments within a selected package
- `InstitutionSettings.tsx`: Institution configuration form
- `ui/*`: shadcn/ui components (button, input, dialog, table, etc.)

**State Management**: React hooks with direct fetch API calls (no global state library)

**Styling**: Tailwind CSS 4.x with Radix UI primitives and lucide-react icons

**Path Aliases**: `@/*` → `client/src/*` (configured in vite.config.ts and tsconfig.json)

### Shared Package

Exports shared types between client and server (currently minimal - just `ApiResponse`).

**To add shared types**:
1. Define in `shared/src/types/index.ts`
2. Export in `shared/src/index.ts`
3. Build: `bun run build --filter=shared` (or let postinstall handle it)
4. Import: `import { Type } from 'shared'`

## Important Implementation Patterns

### Romanian Validation
Always use the existing `isValidCNP()` and `isValidIBAN()` functions. Do not create simplified versions or skip validation.

### Database Operations
- All operations use `bun:sqlite` with prepared statements via `.query()`
- Transactions for bulk operations: `db.run('BEGIN')` ... `db.run('COMMIT')`
- Foreign keys are enabled via `PRAGMA foreign_keys = ON`
- Indexes on foreign keys for performance

### API Response Patterns
- Success: `c.json(data)` or `c.json(data, 201)`
- Error: `c.json({ error: 'message' }, statusCode)`
- Paginated: `c.json({ items, total, limit, offset })`

### Server-Served SPA
After making client changes:
1. Build client: `bun run build:client`
2. Server automatically serves from `client/dist/`
3. Restart server if needed: `sudo systemctl restart miha`

### Hot Reload
Use `bun --watch` for server hot reload. Turbo's `dev` task handles this automatically in monorepo context.

### Build Dependencies
Turbo handles build order automatically:
- `shared` builds first
- `server` and `client` build after `shared` (parallel)
- `postinstall` script builds `shared` and `server` after `bun install`

## Data Validation Rules

- **CNP**: Exactly 13 digits with valid weighted checksum (weights: [2,7,9,1,4,6,3,5,8,2,7,9])
- **IBAN**: Romanian format `RO` + 22 alphanumeric chars, mod-97 validation
- **CUI** (institution tax ID): 6+ digits
- **Money amounts**: Stored as integers (cents/bani) in `plati.suma`
- **Dates**: Stored as Unix timestamps (integers) in `data_plata` and `created_at` fields

## Configuration

- **Server port**: 3765 (configured in `server/src/index.ts` export)
- **Database**: `beneficiaries.sqlite` in server working directory
- **CORS**: Enabled for all origins in development
- **Environment variables**: Support for `VITE_*` vars in client (see turbo.json)

## Deployment Notes

- Production server runs via systemd service (`miha.service`)
- Working directory: `/var/www/miha`
- Server serves both API and built client SPA on port 3765
- See `DEPLOYMENT.md` for full production setup instructions
