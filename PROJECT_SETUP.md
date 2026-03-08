# KERNEL · PROJECT SETUP

## Bootstrap

```bash
npm create vite@latest kernel --template react-ts
cd kernel
npm install

# shadcn setup
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn@latest init

# Core shadcn components
npx shadcn@latest add card badge button separator tabs tooltip
npx shadcn@latest add table sheet dialog popover
npx shadcn@latest add avatar progress

# Data / utils
npm install @tanstack/react-query
npm install @tanstack/react-table
npm install recharts
npm install date-fns
npm install clsx tailwind-merge
npm install lucide-react

# DB client (for local Postgres)
npm install postgres
# or
npm install pg @types/pg
```

---

## Fonts (index.html head)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;1,700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
```

---

## Folder Structure

```
src/
├── components/
│   ├── ui/                    # shadcn components (auto-generated)
│   ├── kernel/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx           # Root layout, nav, pod switcher
│   │   │   ├── MerchandisingShell.tsx # Merchant pod shell
│   │   │   ├── SalesShell.tsx         # Sales/originator pod shell
│   │   │   └── InsightsShell.tsx      # Manager pod shell
│   │   ├── merchandising/
│   │   │   ├── PositionView.tsx       # PHASE 2 · Merchant start screen
│   │   │   ├── PositionCard.tsx       # Position per elevator per crop
│   │   │   ├── PositionSummary.tsx    # Regional rollup
│   │   │   ├── MLRecommendation.tsx   # Basis rec with explainability
│   │   │   ├── OverrideCapture.tsx    # PHASE 1 · Override + reason
│   │   │   └── AlertFeed.tsx          # Ambient alert stream
│   │   ├── sales/
│   │   │   ├── DispatchQueue.tsx      # PHASE 4 · Lead list
│   │   │   ├── LeadCard.tsx           # Single lead in queue
│   │   │   ├── PreCallBrief.tsx       # Context before the call
│   │   │   ├── InboundScreen.tsx      # PHASE 3 · Farmer calls
│   │   │   └── OutcomeCapture.tsx     # Post-call outcome log
│   │   ├── signal/
│   │   │   └── SignalChat.tsx         # PHASE 5 · Kernel Signal assistant
│   │   └── shared/
│   │       ├── DataValue.tsx          # Basis/price display with +/- color
│   │       ├── CoverageBar.tsx        # Coverage gap progress bar
│   │       ├── PersonaBadge.tsx       # Persona indicator
│   │       ├── CropTag.tsx            # Crop type badge
│   │       └── AlertBadge.tsx         # Alert type indicator
├── hooks/
│   ├── usePosition.ts         # Position data queries
│   ├── useLeads.ts            # Dispatch queue queries
│   ├── useAlerts.ts           # Alert stream
│   └── useCurrentUser.ts      # Active persona context
├── lib/
│   ├── db.ts                  # Postgres client
│   ├── utils.ts               # clsx/tw-merge helpers
│   └── format.ts              # Basis formatting, bu formatting
├── types/
│   └── kernel.ts              # TypeScript types from schema
├── data/
│   └── mock.ts                # Fallback mock data if DB unavailable
└── App.tsx
```

---

## TypeScript Types (from schema)

```typescript
// src/types/kernel.ts

export type CropType = 'CORN' | 'SOYBEANS' | 'WHEAT' | 'SORGHUM' | 'OATS'
export type DeliveryMonth = 'JAN' | 'MAR' | 'MAY' | 'JUL' | 'SEP' | 'NOV' | 'DEC'
export type PersonaType = 'MERCHANT' | 'GOM' | 'CSR' | 'STRATEGIC' | 'MANAGER' | 'HYBRID'
export type ContractStatus = 'OPEN' | 'DELIVERED' | 'SETTLED' | 'CANCELLED'
export type LeadOutcome = 'PENDING' | 'SOLD' | 'NO_SALE' | 'CALLBACK' | 'SKIPPED'
export type AlertType =
  | 'COMPETITOR_BID_MOVE'
  | 'FUTURES_MOVE'
  | 'CROP_STRESS_EVENT'
  | 'COVERAGE_GAP'
  | 'CONTRACT_CLOSED'
  | 'POSITION_THRESHOLD'
  | 'INBOUND_CALL'

export interface User {
  id: string
  name: string
  email: string
  persona: PersonaType
  region: string | null
}

export interface Elevator {
  id: string
  name: string
  code: string
  region: string
  lat: number | null
  lng: number | null
  capacity_bu: number | null
}

export interface PositionSummary {
  id: string
  elevator_id: string
  elevator?: Elevator
  user_id: string
  crop: CropType
  delivery_month: DeliveryMonth
  crop_year: number
  bushels_physical: number
  bushels_futures: number
  net_position: number           // computed: physical - futures
  coverage_target: number | null
  coverage_gap: number | null    // computed: max(0, target - physical)
  current_basis: number | null
  ml_basis_rec: number | null
  basis_delta: number | null     // computed: current - rec
  updated_at: string
}

export interface MLRecommendation {
  id: string
  rec_type: 'BASIS' | 'LEAD_SCORE'
  elevator_id: string | null
  elevator?: Elevator
  crop: CropType | null
  delivery_month: DeliveryMonth | null
  recommended_value: number
  reasoning: string | null
  competitor_signal: string | null
  crop_stress_signal: string | null
  position_signal: string | null
  confidence: number | null
  generated_at: string
}

export interface Lead {
  id: string
  farmer_id: string
  farmer?: Farmer
  elevator_id: string
  elevator?: Elevator
  assigned_to: string
  ml_score: number
  ml_rank: number | null
  crop: CropType | null
  estimated_bu: number | null
  recommended_basis: number | null
  competitor_spread: number | null
  distance_to_competitor_mi: number | null
  crop_stress_score: number | null
  last_contact_at: string | null
  last_contact_note: string | null
  outcome: LeadOutcome
  week_of: string
}

export interface Farmer {
  id: string
  name: string
  phone: string | null
  region: string | null
  lat: number | null
  lng: number | null
  preferred_crop: CropType | null
  total_acres: number | null
  notes: string | null
}

export interface Alert {
  id: string
  user_id: string
  alert_type: AlertType
  title: string
  body: string | null
  elevator_id: string | null
  farmer_id: string | null
  is_read: boolean
  acted_on: boolean
  created_at: string
}
```

---

## Basis Formatting Convention

Grain basis is expressed as cents relative to a futures contract month.
Display format: `"14¢ under Dec"` or `"-0.14"` depending on context.

```typescript
// src/lib/format.ts

export function formatBasis(value: number | null): string {
  if (value === null) return '—'
  const cents = Math.round(Math.abs(value) * 100)
  const direction = value < 0 ? 'under' : 'over'
  return `${cents}¢ ${direction}`
}

export function formatBasisShort(value: number | null): string {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)}¢`
}

export function formatBushels(value: number | null): string {
  if (value === null) return '—'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M bu`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K bu`
  return `${value} bu`
}

export function basisColor(value: number | null): string {
  // For basis delta — negative delta means posting below rec (conservative)
  // positive means posting above rec (aggressive)
  if (value === null) return 'text-stone-400'
  if (value > 0.02) return 'text-amber-400'   // aggressive vs rec
  if (value < -0.02) return 'text-sky-400'    // conservative vs rec
  return 'text-green-400'                     // within range of rec
}

export function coveragePct(gap: number | null, target: number | null): number {
  if (!gap || !target || target === 0) return 100
  return Math.round(((target - gap) / target) * 100)
}
```

---

## Key Component: PositionCard

The most important component in the prototype.
Displays net position for one elevator × one crop × one delivery month.

```tsx
// src/components/kernel/merchandising/PositionCard.tsx
// IMPLEMENT THIS FIRST — it is the wedge

interface PositionCardProps {
  position: PositionSummary
  recommendation?: MLRecommendation
  onOverride?: (posted: number, reason?: string) => void
}
```

**What it shows:**
- Elevator name + crop + delivery month header
- Net position (physical bu - futures bu) — large, center
- Coverage gap progress bar (physical / target)
- Current basis vs ML recommendation side by side
- Basis delta with color coding (over/under recommendation)
- Override capture inline — appears when bid ≠ rec

**Visual treatment:**
- Dark card, sky blue left border accent (merchant pod color)
- Basis numbers in IBM Plex Mono, large
- Coverage bar fills green as position improves
- Alert state if coverage gap > 20% and delivery < 6 weeks

---

## Key Component: InboundScreen

The highest-stakes moment in the prototype.
Farmer is on the phone. This screen loads in < 2 seconds.

```tsx
// src/components/kernel/sales/InboundScreen.tsx

interface InboundScreenProps {
  farmer: Farmer
  recommendation: MLRecommendation
  lead?: Lead          // if this farmer is in the queue
}
```

**What it shows:**
- Farmer name — large, immediate
- Recommended basis — VERY large, center, impossible to miss
- One-line reasoning from ML
- Competitor spread in farmer's area
- Last contact note (one line)
- Three action buttons: Sold / No Sale / Callback

**Visual treatment:**
- Full-screen overlay or dedicated route
- High contrast — white numbers on near-black
- Amber accent (Sales pod color)
- Zero chrome — no navigation, no secondary info
- Every extra element is a liability

---

## Agent Instructions

When building Kernel components:

1. **Always check AGENT_CONTEXT.md first** for persona, design principle, and data model context.
2. **Use the Kernel token config** — never hardcode hex values. Use Tailwind classes from tailwind.config.js.
3. **IBM Plex Mono for all numbers** — basis values, bushels, prices, percentages.
4. **Barlow Condensed for all headers** — pod names, section labels, card titles.
5. **Flag open questions** — if building against an unknown field (see Open Questions in AGENT_CONTEXT.md), add a `// INFERRED: validate against stox report` comment.
6. **Instrument everything** — every user action should log a behavioral event. Build the tracking call alongside the component, not after.
7. **Override capture is Phase 1** — it must be present in any screen where a bid or recommendation is displayed.
8. **Stress is the UX metric** — if a component feels busy, it is busy. Simplify.
9. **The hybrid is the primary persona** — mode switching must be instant and stateless.
10. **Agents are not people** — Kernel Signal copy never uses I or me.

*Kernel · Agent Context v1.0 · March 2026*
