# KERNEL · MASTRA AGENT CONTEXT
## Load this document at the start of every build session.

---

## What We Are Building

**Kernel** is the operating system for a grain trading operation. Not a bidding tool. Not a lead gen app. The layer that sits between the futures terminal and the physical market — connecting paper position to physical bushels, ML intelligence to trader decisions, originator dispatch to merchant strategy.

**This is a Cargill internal platform.** Confidential. Grain origination and merchandising workflows.

---

## The Suite

| Pod | Users | Tech | Status |
|-----|-------|------|--------|
| **Kernel Merchandising** | Merchants | React, desktop-first | Building |
| **Kernel Sales** | GOMs, Originators | React + SDUI, multi-form-factor | Building |
| **Kernel Insights** | Managers | React, desktop | Building |
| **Kernel Signal** | All users | Chat assistant, embedded | Future |
| **MarketLink** | Field originators | iOS today → migrating to Kernel Sales | Existing |

---

## The Four Personas

### Merchant
- **Job**: Set conditions. Manage position. Decide how aggressive to bid.
- **Start point**: Position view — what do I own, what have I sold, what is my net exposure.
- **Primary tool need**: Live position + ML explainability + territory strategy map.
- **Failure mode**: Overcommitted on price relative to market. Book blows up.
- **Current pain**: Reconciles physical inventory vs futures hedges manually in a spreadsheet ~once/day from two stale systems.
- **Trust barrier**: 20 years of experience. Will not trust a black box recommendation.

### GOM (Grain Origination Merchant)
- **Job**: Find farmers. Close sales. Work the dispatch queue.
- **Start point**: Dispatch queue — who do I call today, in what order.
- **Primary tool need**: ML-ranked lead queue + pre-call brief + outcome capture.
- **Failure mode**: Competitor gets the bushels. Missed motivated seller.
- **Current pain**: Lead list arrives as weekly email with spreadsheet. Kills urgency. No outcome capture.

### CSR (Customer Service Rep)
- **Job**: Fulfill the promise. Manage delivery. Get the farmer paid.
- **Start point**: Contract queue — what needs to move today.
- **Primary tool need**: Delivery status, payment tracking, farmer communication history.
- **Current pain**: Contract status lives in legacy system. No unified fulfillment view.

### Hybrid (Primary Design Target)
- **Job**: Both merchant AND originator simultaneously.
- **Core problem**: Opposing cognitive demands at the same moment.
  - As merchant: needs position clarity before committing to a bid.
  - As originator: needs to respond instantly when a farmer calls.
- **Symptom**: Maintains 4 spreadsheets because no tool holds both contexts.
- **Design mandate**: Mode switching without friction. One tap between contexts. No lost state.
- **Trust metric**: Spreadsheet displacement over time. Each spreadsheet earned is one replaced.

### Manager (Economic Buyer)
- **Job**: Set targets. Monitor performance. Justify budget.
- **Primary tool need**: Team activity, ML acceptance rate, bushels vs target, margin trend.
- **Current state**: Compiled spreadsheets, stale reports, anecdotal updates.

---

## The Margin Flywheel

This is the business case. Every feature connects back to this loop.

```
Merchant sets smarter conditions
        ↓
   ML gets richer signal
        ↓
 Originator precision improves
        ↓
More bushels close at better margins
        ↓
  Merchant position improves
        ↓
   Merchant trusts tool more
        ↓
        ↑ (repeat, compounding)
```

**The change management argument**: Solve origination without merchant trust = better dispatch tool. Solve both = margin improvement engine that compounds every quarter.

---

## The Go-To-Market Wedge

**Position reconciliation.** The merchant reconciles physical inventory vs futures hedges manually from two stale systems. If Kernel is the only place where that number is live and accurate, the merchant does not need to be convinced to adopt it. The data pulls him in.

Position is the Trojan horse. Once the merchant checks it every morning, the ML recommendation, the territory map, and the dispatch queue are right there.

---

## Design Principles (Non-Negotiable)

1. **Position is the wedge.** Not convenience — certainty.
2. **Start screen is a persona signal.** Merchant → position. GOM → queue. Never a toggle.
3. **Stress is the UX metric.** Not clicks. Did she feel less likely to make a career-ending mistake today.
4. **The map sequences, it does not just display.** Intelligence is in the order, not the pins.
5. **ML must show its work.** Trader language, not data science language.
6. **Intelligence is invisible until relevant.** No dashboards. Surface at moment of decision.
7. **Earn trust one spreadsheet at a time.** Never try to replace everything at once.
8. **The bid is an event, not a form field.** It touches position, leads, spread, and feedback loop.
9. **The hybrid is the primary persona.** Design for two jobs at once. Pure roles are the simpler case.
10. **The feedback loop is the moat.** Override history compounds. Capture from day one.
11. **Agents are not people.** Kernel Signal never uses I or me. Findings, not opinions.
12. **Informed, not surveilled.** Behavioral context helps. Never surface the mechanism.
13. **Instrumentation is specced before features.** If it ships without instrumentation it did not really ship.

---

## Tech Stack

```
Frontend:   React 19 + Vite 7
Components: shadcn/ui + Tailwind CSS (Kernel token config)
State:      TanStack Query (hooks fetch from API, no direct mock imports)
Database:   SQLite (better-sqlite3) via Drizzle ORM — file: kernel.db
ORM:        Drizzle (schema in src/db/schema.ts is source of truth)
API:        Express server (src/server/index.ts) on port 3001
Agent:      Mastra framework
AI:         Anthropic Claude API (claude-sonnet-4-20250514)
Fonts:      Barlow Condensed (display), IBM Plex Sans (body), IBM Plex Mono (data)
Tests:      Vitest + Playwright (141 unit tests passing)
```

### Dev Setup (zero-install database)

```bash
npm run db:seed      # migrate + seed SQLite (creates kernel.db)
npm run server       # Express API on :3001
npm run dev          # Vite on :5173 (proxies /api → :3001)
```

- No Postgres, no Docker — SQLite file-based DB
- Drizzle migrations in drizzle/ directory
- Vite proxy config in vite.config.ts forwards /api to Express
- Test setup mocks fetch globally (src/test/setup.ts) — no real API needed for tests
- `.env` not required (SQLite uses local file path)

---

## Visual Language (Cargill / Kernel Brand)

```
Background:     #080A06  (near black, slight green tint)
Surface:        #0F120C
Surface raised: #161A12
Border:         #1E2618

Primary green:  #5A9424  (Cargill brand green)
Green bright:   #7AC43A  (interactive, highlights)
Green dark:     #3A6E14  (borders, subtle)

Amber:          #C47A18  (Sales pod, originator layer, alerts)
Amber bright:   #E8A030  (interactive amber)

Sky blue:       #2A6A9A  (Merchandising pod accent)
Sky bright:     #4A9AC8

Violet:         #6B5FC4  (ML / intelligence layer)
Violet bright:  #8B7FE4

Text primary:   #EDF0E5
Text dim:       #8A9478
Text muted:     #4A5440
```

**Pod color coding:**
- Kernel Merchandising → sky blue borders/accents
- Kernel Sales → amber borders/accents
- Kernel Insights → stone/neutral
- ML / Kernel Signal layer → violet
- Cargill brand moments → green

---

## Data Model (Drizzle schema: src/db/schema.ts is source of truth)

Key tables and their purpose:

| Table | Purpose | Mock Data |
|-------|---------|-----------|
| `users` | The four personas + manager | 5 users |
| `elevators` | Physical grain storage locations | 5 elevators |
| `farmers` | Farmer contacts with location and relationship notes | 8 farmers |
| `position_summary` | Net position — physical minus futures. The merchant's start screen. | 8 rows |
| `ml_recommendations` | Every basis rec and lead score the ML generates | 4 recs |
| `ml_overrides` | **Phase 1 priority.** Every override + optional reason. The moat. | empty |
| `leads` | ML-ranked dispatch queue with pre-call brief data | 8 leads |
| `alerts` | Real-time signals surfaced at moment of relevance | 6 alerts |
| `contracts` | Physical grain contracts — different meaning per persona | empty |
| `behavioral_events` | Instrumentation telemetry | empty |
| `feedback_responses` | In-context feedback captures | empty |

Note: `schema.sql` is from the original prompt design session and has drifted. Drizzle schema is canonical.
SQLite doesn't support enums — crop_type, persona_type, etc. are TEXT columns validated at app layer.

---

## Open Questions (Known Unknowns — Flag, Do Not Invent)

These are things we do not know yet. Infer carefully. Flag clearly. Validate in user research.

1. **Stox report schema** — actual field names, grain categories, ownership codes unknown. Schema is inferred. Validate against real stox report before treating as canonical.
2. **Contract schema** — ERP contract data model unknown. What fields exist, what the status lifecycle looks like exactly.
3. **FCM integration** — futures data path unclear. Discovery task: identify which FCM clears their trades and whether API access is possible.
4. **Basis vocabulary** — do they say "14 under December" or express it differently? Use "under" as default until validated.
5. **Position calculation** — physical minus futures is the inferred model. May be more nuanced (HTA contracts, basis contracts, etc).
6. **Elevator ownership model** — do merchants own specific elevators or is it regional? Schema assumes user-elevator assignment.
7. **Lead scoring model** — ML lead score inputs unknown. Schema has score and rank. Reasoning is simulated.

---

## Build Order

| Phase | What | Priority |
|-------|------|----------|
| 1 | Instrumentation + feedback loop | **Build first. Always.** |
| 2 | Merchant position dashboard (start screen) | Wedge. Drives merchant adoption. |
| 3 | Salesforce CTI inbound trigger | Inbound workflow. Seconds matter. |
| 4 | Live dispatch queue + outcome capture | Replaces weekly email. |
| 5 | Platform assistant v1 (Kernel Signal) | Backed by ontology. |
| 6 | Competitor bid pipeline | Map overlay. |
| 7 | Position reconciliation (FCM feed) | The full wedge. |
| 8 | FSA parcel matching | Spatial supply layer. |
| 9 | Satellite NDVI overlay | Geospatial scoring. |
| 10 | Research agent continuous feed | Always-on intelligence. |

---

## Prototype Scope (Current Session)

Building a **reaction prototype** — not production code. Goal is to get something in front of merchants and GOMs fast enough that their reactions tell us what the real data model looks like and what the actual hierarchy of information is.

**Three screens, loosely connected:**

1. **Position View** (Kernel Merchandising) — merchant start screen. Inferred data model. Show to merchant → let them correct it.
2. **Dispatch Queue** (Kernel Sales) — GOM lead list with pre-call brief. Well-mapped. Build with confidence.
3. **Inbound Call Screen** (Kernel Sales) — single high-stakes moment. Farmer calls, context fires instantly.

**Success criteria**: Users can't help but tell us what's wrong. That's the research outcome.

---

## Session Notes

- Cargill workforce: legacy systems, recent layoffs, people at capacity. Low tolerance for learning curves. Tool must reduce cognitive load on day one, not after ramp.
- The workers who remain are tired. Design with that in mind. Stress is the UX metric.
- Kernel name is established internally. Do not rename anything.
- MarketLink is an existing iOS app migrating into Kernel Sales over time. Do not replace it — build toward it.
- Research agent (separate Mastra project) will feed ontology into Kernel Signal. Coordinate schemas.
- Six user interviews scheduled next week. Prototype needs to be ready to provoke reactions.

---

*Kernel · Product Brief v0.5 · Cargill Confidential · March 2026*
