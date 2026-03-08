# Kernel Component Guide

Reference for coding agents working on Kernel v0. Every component, its props, and how to use it.

---

## Foundation

### Types (`src/types/kernel.ts`)

All TypeScript types derived from the database schema:

```ts
// Enums
type CropType = 'CORN' | 'SOYBEANS' | 'WHEAT' | 'SORGHUM' | 'OATS'
type DeliveryMonth = 'JAN' | 'MAR' | 'MAY' | 'JUL' | 'SEP' | 'NOV' | 'DEC'
type PersonaType = 'MERCHANT' | 'GOM' | 'CSR' | 'STRATEGIC' | 'MANAGER' | 'HYBRID'
type ContractStatus = 'OPEN' | 'DELIVERED' | 'SETTLED' | 'CANCELLED'
type LeadOutcome = 'PENDING' | 'SOLD' | 'NO_SALE' | 'CALLBACK' | 'SKIPPED'
type AlertType = 'COMPETITOR_BID_MOVE' | 'FUTURES_MOVE' | 'CROP_STRESS_EVENT' | 'COVERAGE_GAP' | 'CONTRACT_CLOSED' | 'POSITION_THRESHOLD' | 'INBOUND_CALL'
type OverrideReasonCategory = 'FARMER_CONTEXT' | 'STORAGE_CONSTRAINT' | 'GUT_READ' | 'MARKET_READ' | 'RELATIONSHIP' | 'OTHER'

// Core entities
interface User { id, name, email, persona: PersonaType, region }
interface Elevator { id, name, code, region, lat, lng, capacity_bu }
interface PositionSummary { id, elevator_id, elevator?, user_id, crop, delivery_month, crop_year, bushels_physical, bushels_futures, net_position, coverage_target, coverage_gap, current_basis, ml_basis_rec, basis_delta, updated_at }
interface MLRecommendation { id, rec_type, user_id, elevator_id, elevator?, farmer_id, crop, delivery_month, crop_year, recommended_value, reasoning, competitor_signal, crop_stress_signal, position_signal, market_signal, confidence, generated_at }
interface Farmer { id, name, phone, email, salesforce_id, region, lat, lng, preferred_crop, total_acres, notes }
interface Lead { id, farmer_id, farmer?, elevator_id, elevator?, assigned_to, ml_score, ml_rank, crop, estimated_bu, recommended_basis, competitor_spread, distance_to_competitor_mi, crop_stress_score, last_contact_at, last_contact_note, outcome, outcome_basis, outcome_bu, outcome_note, outcome_at, week_of, is_active }
interface Alert { id, user_id, alert_type, title, body, elevator_id, farmer_id, data, is_read, acted_on, created_at }
```

### Format Utils (`src/lib/format.ts`)

```ts
formatBasis(value: number | null): string     // -0.14 → "14¢ under"
formatBasisShort(value: number | null): string // -0.14 → "-14.0¢"
formatBushels(value: number | null): string    // 480000 → "480K bu"
basisColor(value: number | null): string       // → Tailwind text color class
coveragePct(gap, target): number               // → 0-100
```

### Mock Data (`src/data/mock.ts`)

Exports: `users`, `elevators`, `positionSummaries`, `farmers`, `mlRecommendations`, `leads`, `alerts`, `mlOverrides`, `mockStore`

`mockStore` provides mutable methods: `addOverride()`, `updateLeadOutcome()`, `markAlertRead()`, `dismissAlert()`

---

## Hooks

### `useCurrentUser()` → `{ currentUser, setCurrentUser, demoUsers, startRoute }`
Returns the active demo user and setter. Wrap app in `<UserProvider>`.

### `usePosition(filters?)` → `{ positions, recommendations, getRecommendation, summary }`
Returns positions filtered by current user. Optional `{ crop: CropType }` filter.
`summary` contains: `totalPhysical`, `totalFutures`, `totalNet`, `totalCoverageGap`, `totalCoverageTarget`, `elevatorCount`.

### `useLeads(filters?)` → `{ leads, captureOutcome, getLeadByFarmerId }`
Returns leads assigned to current user. Optional `{ outcome, showAll }` filter.
`captureOutcome(leadId, outcome, data?)` updates lead in mock store.

### `useAlerts()` → `{ alerts, unreadCount, markRead, dismiss }`
Returns alerts for current user, sorted by created_at descending.

---

## Shared Components (`src/components/kernel/shared/`)

### `<DataValue>`
Displays a numeric value with formatting and optional color coding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number \| null` | required | The value to display |
| `format` | `'basis' \| 'basis-short' \| 'bushels' \| 'raw'` | `'raw'` | Formatting function |
| `size` | `'xl' \| 'lg' \| 'md' \| 'sm'` | `'md'` | Display size |
| `colorize` | `boolean` | `false` | Apply basis color coding |
| `label` | `string` | — | Optional label above value |

```tsx
<DataValue value={-0.14} format="basis" size="lg" label="Current Basis" />
<DataValue value={0.03} format="basis-short" size="sm" colorize />
<DataValue value={480000} format="bushels" size="md" label="Physical" />
```

### `<CoverageBar>`
Progress bar showing coverage percentage with alert state.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gap` | `number \| null` | required | Bushels remaining to fill |
| `target` | `number \| null` | required | Total target bushels |
| `showLabel` | `boolean` | `true` | Show percentage + gap text |
| `alertThreshold` | `number` | `80` | Below this → amber state |

```tsx
<CoverageBar gap={120000} target={600000} />
<CoverageBar gap={120000} target={600000} showLabel={false} alertThreshold={90} />
```

### `<PersonaBadge>`
Shows persona type with appropriate color variant.

| Prop | Type | Description |
|------|------|-------------|
| `persona` | `PersonaType` | The persona to display |

Color mapping: MERCHANT → sky, GOM → amber, HYBRID → green, CSR/STRATEGIC/MANAGER → secondary.

### `<CropTag>`
Badge showing crop type label.

| Prop | Type | Description |
|------|------|-------------|
| `crop` | `CropType` | The crop to display |

### `<AlertBadge>`
Icon + label for alert types.

| Prop | Type | Description |
|------|------|-------------|
| `type` | `AlertType` | The alert type |

---

## Merchandising Components (`src/components/kernel/merchandising/`)

### `<PositionView>`
Main merchant screen. Uses `usePosition`, `useAlerts`, `useCurrentUser`. Shows summary card, position cards, crop filter, alert feed.

### `<PositionCard>`
Single position display (elevator × crop × delivery month).

| Prop | Type | Description |
|------|------|-------------|
| `position` | `PositionSummary` | Position data |
| `recommendation` | `MLRecommendation?` | Optional ML rec |
| `onOverride` | `(posted, reason?, category?) => void` | Override callback |

Sky blue left border. Alert state (glow-amber shadow) when coverage gap > 20%.

### `<MLRecommendation>`
Expandable ML recommendation detail panel.

| Prop | Type | Description |
|------|------|-------------|
| `recommendation` | `MLRecommendation` | The recommendation |

Shows: confidence percentage, reasoning (1-line collapsed, full expanded), signal breakdown (competitor, crop stress, position, market).

### `<OverrideCapture>`
Inline form for capturing why a bid differs from ML recommendation.

| Prop | Type | Description |
|------|------|-------------|
| `currentBasis` | `number` | The posted basis value |
| `mlRec` | `number` | The ML recommended value |
| `onSubmit` | `(posted, category, note) => void` | Submit callback |
| `onCancel` | `() => void` | Cancel callback |

6 reason categories (2-tap): Farmer Context, Storage, Gut Read, Market Read, Relationship, Other.

### `<PositionSummaryCard>`
Aggregate summary across all positions.

| Prop | Type | Description |
|------|------|-------------|
| `totalPhysical` | `number` | Total physical bushels |
| `totalFutures` | `number` | Total futures bushels |
| `totalNet` | `number` | Net position |
| `totalCoverageGap` | `number` | Aggregate gap |
| `totalCoverageTarget` | `number` | Aggregate target |
| `elevatorCount` | `number` | Number of elevators |

### `<AlertFeed>`
Chronological alert list with dismiss/read actions.

| Prop | Type | Description |
|------|------|-------------|
| `alerts` | `Alert[]` | Alert list |
| `onDismiss` | `(alertId) => void` | Dismiss callback |
| `onRead` | `(alertId) => void` | Read callback |

---

## Sales Components (`src/components/kernel/sales/`)

### `<DispatchQueue>`
Main GOM screen. ML-ranked lead list with pre-call brief panel.

### `<LeadCard>`
Single lead in dispatch queue.

| Prop | Type | Description |
|------|------|-------------|
| `lead` | `Lead` | Lead data |
| `isSelected` | `boolean` | Highlight state |
| `onClick` | `() => void` | Selection callback |

Amber left border. Shows: farmer name, score, rank, crop, estimated volume, competitor spread, distance, last contact.

### `<PreCallBrief>`
Detailed farmer context for pre-call preparation.

| Prop | Type | Description |
|------|------|-------------|
| `lead` | `Lead` | Lead with farmer data |

Shows: farmer details, recommendation, competitor spread, crop stress level, last contact note.

### `<OutcomeCapture>`
Call outcome recording.

| Prop | Type | Description |
|------|------|-------------|
| `onSubmit` | `(outcome, data?) => void` | Submit callback |

4 outcomes: Sold (with basis + bushels), No Sale, Callback, Skip. Optional note.

### `<InboundScreen>`
Full-screen overlay for inbound calls. Route: `/sales/inbound/:farmerId`.
Uses `useParams` for farmer lookup. Shows farmer name VERY LARGE, recommended basis VERY LARGE, one-line reasoning, three action buttons.

---

## Layout (`src/components/kernel/layout/`)

### `<AppShell>`
Main layout wrapper. Sidebar with nav, user switcher, `<Outlet>` for content.
Nav items filtered by persona. User switcher triggers persona-driven routing.

### `<MerchandisingShell>`
Wrapper with sky blue accent line. Contains `<Outlet>`.

### `<SalesShell>`
Wrapper with amber accent line. Contains `<Outlet>`.

---

## Routing

```
/                           → Redirect to /merchandising
/merchandising              → PositionView (via MerchandisingShell)
/sales                      → DispatchQueue (via SalesShell)
/sales/inbound/:farmerId    → InboundScreen (full-screen, outside AppShell)
/strategy                   → StrategyView
/signal                     → SignalChat
```

---

## Test Utilities

### `renderWithProviders(ui)` (`src/test/test-utils.tsx`)
Wraps component in `BrowserRouter` + `UserProvider`. Use for integration tests.

```tsx
import { renderWithProviders } from '@/test/test-utils'
renderWithProviders(<PositionView />)
```

### Test IDs
All components use `data-testid` attributes for reliable test selectors:
- `position-view`, `position-card`, `position-summary`
- `dispatch-queue`, `lead-card`, `pre-call-brief`
- `inbound-screen`, `inbound-farmer-name`, `inbound-basis`
- `inbound-sold`, `inbound-no-sale`, `inbound-callback`
- `data-value`, `coverage-pct`, `coverage-fill`
- `persona-badge`, `crop-tag`, `alert-badge`
- `ml-recommendation`, `override-capture`, `alert-feed`, `alert-item`
- `outcome-capture`, `outcome-sold`, `outcome-no-sale`, `outcome-callback`
- `strategy-view`, `signal-chat`, `signal-input`, `signal-send`

---

## Adding New Features — Checklist

1. Define types in `src/types/kernel.ts`
2. Add mock data in `src/data/mock.ts`
3. Create component in appropriate pod directory
4. Add route in `src/App.tsx` if needed
5. Add telemetry events in `src/lib/telemetry.ts`
6. Write unit test (`component.test.tsx`)
7. Write E2E test (`e2e/feature.spec.ts`)
8. Verify: `npm test && npx tsc --noEmit`
