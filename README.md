# Kernel v0 — Grain Trading Prototype

Operating system for Cargill grain trading operations. Prototype for user interviews.

## Quick Start

```bash
npm install
npm run db:migrate   # Create SQLite tables
npm run db:seed      # Load seed data (5 users, 5 elevators, 8 farmers, 37 positions, 8 leads, 6 alerts)
npm run server       # Start API server → http://localhost:3001
npm run dev          # Start Vite dev server → http://localhost:5173
```

Both `server` and `dev` must be running. Vite proxies `/api` requests to port 3001.

### Testing

```bash
npm test             # 142 unit + integration tests
npm run test:watch   # Watch mode
npm run test:e2e     # Playwright E2E (requires dev server)
```

## Architecture

```
src/
├── components/
│   ├── ui/                     # shadcn/ui base components
│   └── kernel/
│       ├── layout/             # AppShell, MerchandisingShell, SalesShell
│       ├── merchandising/      # PositionView, PositionTable, MLRecommendation, etc.
│       ├── sales/              # DispatchQueue, LeadCard, InboundScreen, etc.
│       ├── strategy/           # StrategyView (stub)
│       ├── signal/             # SignalChat (stub)
│       ├── alerts/             # AlertsView
│       └── shared/             # DataValue, CoverageBar, PersonaBadge, CropTag, AlertBadge, ErrorBanner
├── hooks/                      # useCurrentUser, usePosition, useLeads, useAlerts
├── lib/                        # utils, format, telemetry
├── types/                      # TypeScript type definitions (kernel.ts)
├── db/                         # Drizzle schema, seed script, database connection
├── server/                     # Express API server
├── data/                       # Mock data (used by tests only)
└── test/                       # Test utilities
e2e/                            # Playwright E2E specs
drizzle/                        # Generated SQL migrations
kernel.db                       # SQLite database file (gitignored)
```

### Data Flow

```
seed.ts → SQLite (kernel.db) → Express API (port 3001) → Vite proxy → React Query hooks → Components
```

In production, the SQLite seed will be replaced by an upstream legacy database feed.

## API Endpoints

| Method | Path | Query Params | Description |
|--------|------|-------------|-------------|
| GET | `/api/users` | — | All users |
| GET | `/api/elevators` | — | All elevators |
| GET | `/api/farmers` | — | All farmers |
| GET | `/api/positions` | `userId` (required) | Position summaries for user's elevators |
| GET | `/api/recommendations` | `userId` (required) | ML recommendations for user |
| GET | `/api/leads` | `userId` (required) | Leads assigned to user, sorted by ml_rank |
| GET | `/api/alerts` | `userId` (required) | Alerts for user, sorted by created_at desc |
| PATCH | `/api/leads/:id/outcome` | — | Update lead outcome. Body: `{ outcome, basis?, bu?, note? }` |
| PATCH | `/api/alerts/:id/read` | — | Mark alert as read |
| PATCH | `/api/alerts/:id/dismiss` | — | Dismiss alert (marks read + acted_on) |

All endpoints return `{ error, status }` on failure. PATCH endpoints validate inputs and return 404 if record not found.

## Database

SQLite via Drizzle ORM. Zero-install — database is a local file (`kernel.db`).

**Tables**: users, elevators, farmers, position_summary, ml_recommendations, ml_overrides, leads, alerts, contracts, behavioral_events, feedback_responses

**Schema**: `src/db/schema.ts` (Drizzle is the source of truth)

**Migrations**: `npm run db:migrate` runs generated SQL from `drizzle/`

**Seed data**: `npm run db:seed` populates all tables with realistic grain trading data. Simulated current date is mid-October 2025 (harvest in progress). Position coverage patterns are realistic: near months ~75% covered, carry months ~35%, new crop ~10-20%.

## Design System

### Colors (Cargill Brand)
- **Background**: `#080A06` (kernel-bg) — near-black, slight green tint
- **Surfaces**: `#0F120C` (kernel-surface), `#161A12` (kernel-surface2)
- **Green**: `#5A9424` (brand), `#7AC43A` (interactive) — trust, Cargill identity
- **Amber**: `#C47A18` (brand), `#E8A030` (interactive) — Sales pod, alerts
- **Sky Blue**: `#2A6A9A` (brand), `#4A9AC8` (interactive) — Merchandising pod
- **Violet**: `#6B5FC4` (brand), `#8B7FE4` (interactive) — ML/Intelligence layer
- **Text**: `#EDF0E5` (primary), `#8A9478` (dim), `#4A5440` (muted)

### Pod Color Coding
| Pod | Accent | Usage |
|-----|--------|-------|
| Merchandising | Sky Blue | Borders, highlights, nav accent |
| Sales | Amber | Borders, highlights, nav accent |
| Insights | Stone | Neutral, manager views |
| Signal | Violet | ML/AI layer indicators |

### Typography
- **Display**: Barlow Condensed — headers, labels, navigation
- **Body**: IBM Plex Sans — paragraph text, descriptions
- **Data**: IBM Plex Mono — numbers, basis values, bushels

### Data Display Sizes
| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `text-data-xl` | 48px | 700 | Hero numbers (inbound basis) |
| `text-data-lg` | 32px | 600 | Primary metrics (net position) |
| `text-data-md` | 24px | 600 | Secondary metrics |
| `text-data-sm` | 16px | 500 | Inline data values |

## Personas

| Name | Persona | Start Screen | Nav Labels | Description |
|------|---------|-------------|------------|-------------|
| Marcus Webb | MERCHANT | Position View | Position, Market Landscape, Signal | Sets conditions, manages position |
| Dana Kowalski | HYBRID | Position View | Position, Sales, Market Landscape, Signal | Both merchant AND originator |
| Tyler Briggs | GOM | Dispatch Queue | Sales, Signal | Finds farmers, closes sales |
| Sarah Chen | CSR | — | — | Fulfillment, delivery |
| Jim Harrington | MANAGER | — | — | Oversight, reporting |

Switch between users via the dropdown in the sidebar footer.

## Screens

### Position View (`/merchandising`)
Merchant's start screen. Expandable table showing net position (physical - futures) per elevator × crop × delivery month.

Key components:
- **PositionSummaryCard** — aggregate across all elevators, "last updated" indicator
- **PositionTable** — expandable rows with inline detail (replaces old separate cards)
- **CoverageBar** — 3-tier: green (≥80%), amber (40-79%), red (<40%)
- **MLRecommendation** — expandable basis recommendation with confidence + signals
- **OverrideCapture** — inline reason capture when bid differs from ML rec

Filters: Elevator (dropdown), Crop (button group), Delivery Month (button strip for all CME contract months)

### Dispatch Queue (`/sales`)
GOM's start screen. ML-ranked lead list with pre-call briefs.

Key components:
- **LeadCard** — farmer, score, spread, estimated volume
- **PreCallBrief** — farmer context, recommendation, crop stress, last note
- **OutcomeCapture** — Sold/No Sale/Callback/Skip with optional details

### Alerts (`/alerts`)
All-persona alert feed with dismiss and mark-read actions.

### Inbound Screen (`/sales/inbound/:farmerId`)
Full-screen overlay. Farmer on the phone — loads in < 2 seconds.

Shows: farmer name (VERY LARGE), recommended basis (VERY LARGE), one-line reasoning, competitor spread, last contact note, three action buttons.

### Strategy View (`/strategy`) — Stub
Map canvas placeholder with sidebar for elevator list, layer toggles, ML signals.

### Signal Chat (`/signal`) — Stub
Simulated assistant with canned responses for position, basis, leads, competitors, crop stress queries.

## Formatting Conventions

```ts
formatBasis(-0.14)     // "14¢ under"
formatBasis(0.03)      // "3¢ over"
formatBasisShort(-0.14) // "-14.0¢"
formatBushels(480000)   // "480K bu"
formatBushels(1200000)  // "1.2M bu"
basisColor(0.03)        // "text-amber-400" (aggressive)
basisColor(-0.03)       // "text-sky-400" (conservative)
basisColor(0.01)        // "text-green-400" (within range)
```

## Telemetry

All user interactions are tracked via `src/lib/telemetry.ts`:

| Event | Trigger | Captured Data |
|-------|---------|---------------|
| `MODE_SWITCH` | User changes pod/view | from, to |
| `OVERRIDE_SUBMITTED` | Merchant logs bid deviation reason | original_rec, posted_value, delta, reason_category |
| `LEAD_OUTCOME_CAPTURED` | GOM records call result | lead_id, outcome, basis_posted |
| `ALERT_DISMISSED` | User dismisses an alert | alert_id, alert_type |
| `INBOUND_SCREEN_LOADED` | Inbound screen opens | farmer_id |

Events log to console in dev. Production: POST to analytics endpoint.

## Error Handling

- **Error boundary** wraps entire app — component crashes show reload screen instead of blank page
- **Hook error states** — all hooks surface `isError` and `error` from React Query
- **Loading skeletons** — views show skeleton placeholders while data loads
- **Error banners** — views show retry-able error banner when API fails
- **Mutation feedback** — save failures show inline error text
- **Server validation** — PATCH endpoints validate inputs, return 404/400 with error messages
- **Try/catch** — all Express endpoints catch DB errors and return 500s

## Test Structure
- `src/**/*.test.{ts,tsx}` — Vitest unit/integration tests (142 tests)
- `e2e/**/*.spec.ts` — Playwright E2E tests
- `src/test/setup.ts` — Test setup (jest-dom matchers, global fetch mock)
- `src/test/test-utils.tsx` — `renderWithProviders` helper with QueryClient + Router + UserProvider

## Tech Stack

- **React 19** + TypeScript (strict mode)
- **Vite 7** (dev server + build)
- **Tailwind CSS v4** (CSS-first config, custom properties)
- **shadcn/ui** (manually installed, Kernel-themed)
- **React Router v7** (persona-driven routing)
- **TanStack React Query v5** (data fetching, caching, mutations)
- **Drizzle ORM** (SQLite schema, migrations, queries)
- **better-sqlite3** (SQLite driver)
- **Express** (API server)
- **Vitest** + React Testing Library (unit/integration)
- **Playwright** (E2E + visual regression)
- **date-fns** (time formatting)
- **Lucide React** (icons)

## Known Stubs / Future Work

| Area | Status | Notes |
|------|--------|-------|
| Authentication | Not needed | Internal network handles auth upstream |
| Salesforce integration | Stub | Inbound trigger simulated via URL |
| Map/spatial layers | Stub | Layout exists, map library TBD |
| Kernel Signal | Stub | Canned responses, no Mastra integration |
| ML pipeline | Stub | Static recommendations, no real model |
| Upstream data feed | Stub | SQLite seed data, will connect to legacy DB API |
| Responsive | Sales only | Inbound screen is mobile-ready |
