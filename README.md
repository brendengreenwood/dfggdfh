# Kernel v0 — Grain Trading Prototype

Operating system for Cargill grain trading operations. Prototype for user interviews.

## Quick Start

```bash
npm install
npm run dev        # → http://localhost:5173
npm test           # Vitest unit + integration tests
npm run test:e2e   # Playwright E2E tests
```

## Architecture

```
src/
├── components/
│   ├── ui/                     # shadcn/ui base components
│   └── kernel/
│       ├── layout/             # AppShell, MerchandisingShell, SalesShell
│       ├── merchandising/      # PositionView, PositionCard, MLRecommendation, etc.
│       ├── sales/              # DispatchQueue, LeadCard, InboundScreen, etc.
│       ├── strategy/           # StrategyView (stub)
│       ├── signal/             # SignalChat (stub)
│       └── shared/             # DataValue, CoverageBar, PersonaBadge, CropTag, AlertBadge
├── hooks/                      # useCurrentUser, usePosition, useLeads, useAlerts
├── lib/                        # utils, format, telemetry
├── types/                      # TypeScript type definitions
├── data/                       # Mock data (seed from schema.sql)
└── test/                       # Test utilities
e2e/                            # Playwright E2E specs
```

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

| Name | Persona | Start Screen | Description |
|------|---------|-------------|-------------|
| Marcus Webb | MERCHANT | Position View | Sets conditions, manages position |
| Dana Kowalski | HYBRID | Position View | Both merchant AND originator |
| Tyler Briggs | GOM | Dispatch Queue | Finds farmers, closes sales |
| Sarah Chen | CSR | — | Fulfillment, delivery |
| Jim Harrington | MANAGER | — | Oversight, reporting |

Switch between users via the dropdown in the sidebar footer.

## Screens

### Position View (`/merchandising`)
Merchant's start screen. Shows net position (physical - futures) per elevator × crop × delivery month.

Key components:
- **PositionSummaryCard** — aggregate across all elevators
- **PositionCard** — one position per card, sky blue left border
- **CoverageBar** — fills green, alert state when gap > 20% and delivery < 6 weeks
- **MLRecommendation** — expandable basis recommendation with signals
- **OverrideCapture** — inline reason capture when bid differs from ML rec

### Dispatch Queue (`/sales`)
GOM's start screen. ML-ranked lead list with pre-call briefs.

Key components:
- **LeadCard** — farmer, score, spread, estimated volume
- **PreCallBrief** — farmer context, recommendation, crop stress, last note
- **OutcomeCapture** — Sold/No Sale/Callback/Skip with optional details

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

## Testing

```bash
npm test             # 123 unit + integration tests
npm run test:watch   # Watch mode
npm run test:e2e     # Playwright E2E (requires dev server)
```

### Test Structure
- `src/**/*.test.{ts,tsx}` — Vitest unit/integration tests
- `e2e/**/*.spec.ts` — Playwright E2E tests
- `src/test/setup.ts` — Test setup (jest-dom matchers)
- `src/test/test-utils.tsx` — `renderWithProviders` helper

## Tech Stack

- **React 19** + TypeScript
- **Vite 7** (dev server + build)
- **Tailwind CSS v4** (CSS-first config, custom properties)
- **shadcn/ui** (manually installed, Kernel-themed)
- **React Router v7** (persona-driven routing)
- **Vitest** + React Testing Library (unit/integration)
- **Playwright** (E2E + visual regression)
- **date-fns** (time formatting)
- **Lucide React** (icons)

## Known Stubs / Future Work

| Area | Status | Notes |
|------|--------|-------|
| Authentication | Not needed | Prototype uses demo user switcher |
| Salesforce integration | Stub | Inbound trigger simulated via URL |
| Map/spatial layers | Stub | Layout exists, map library TBD |
| Kernel Signal | Stub | Canned responses, no Mastra integration |
| ML pipeline | Stub | Static recommendations, no real model |
| Database | Mock | In-memory data, no Postgres connection |
| Responsive | Sales only | Inbound screen is mobile-ready |
