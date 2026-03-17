# Strategy Map View — Design & Product Overview

## What This Is

The Strategy Map is a spatial decision tool for grain merchants. It answers the question every merchant asks every day: **"Who am I winning, who am I losing, and what do I need to change?"**

A grain merchant's job is to buy grain from farmers at local elevators. They compete with other elevator operators (ADM, Bunge, Landus, Heartland, etc.) for the same farmers' bushels. The merchant's primary lever is their **posted basis** — a discount off the CME futures price that represents what they'll pay for grain at their facility.

The problem is that pricing decisions today happen in spreadsheets and gut feel. A merchant might know their biggest competitor tightened their basis last week, but they can't see *which farmers* that puts at risk, or how adjusting their own bid by 2¢ changes the competitive picture across their entire territory.

This view makes that visible.

---

## Core Concepts

### Posted Basis

Every elevator posts a **basis bid** for each crop, expressed as cents under the futures contract. For example, "Dec 2025 Corn: -$0.15" means the elevator will buy December corn at the futures price minus 15 cents per bushel.

A tighter (smaller) basis is more aggressive — the farmer gets paid more. A wider basis means the elevator is paying less. The basis is the competitive lever.

### Freight Advantage

A farmer 5 miles from Elevator A and 25 miles from Elevator B doesn't just compare posted bids — they factor in the cost of hauling grain. Even if Elevator B posts a tighter basis, the farmer may net more money selling to nearby Elevator A after accounting for trucking costs.

We model this as:

```
Net price to farmer = Posted basis − (Distance × Freight cost per mile)
```

The farmer sells to whoever gives them the highest net price. This means a merchant's competitive reach extends beyond their natural territory when they post an aggressive enough bid to overcome the freight disadvantage.

### Voronoi Territories

Each elevator (yours and competitors') naturally "owns" the farmers closest to it — this is the Voronoi cell. The map draws these territories to show the natural geographic boundaries. But real competition bleeds across these lines, which is where the bid model comes in.

---

## How the View Works

### 1. Pick an Elevator → Pick a Contract

The merchant starts by selecting one of their elevators from the left panel, then selects a specific futures contract (e.g., "Dec 2025 Corn"). This scopes everything — the map, the bid model, the competitive analysis — to that specific delivery point and crop.

Contracts are displayed compactly: delivery month, crop, and the current posted basis all on one line. The merchant can quickly scan and pick.

### 2. Set the Bid Model

Once a contract is selected, a floating **Bid Model** panel appears. It has three controls:

- **Posted** — The base bid in cents under futures (e.g., 15¢). This is the number that goes on the board.
- **Leeway** — How much the bid varies by farmer distance. Farmers at the elevator door get the tightest price (posted − leeway). Farmers at the edge of the territory get the widest (posted + leeway). This models the real practice of offering slightly better prices to closer farmers.
- **Freight** — The assumed cost per mile for a farmer to truck grain. Default is $0.40/mile. This drives the competitive calculation — it determines how much distance matters.

Every change to these values **instantly recolors the map**. The merchant can see the competitive impact of a 1¢ change in real time.

### 3. Read the Map

Every farmer is a dot on the map. The dot color tells the merchant who's winning:

- **Green** — You're winning this farmer. Your net price (basis minus their freight cost to your elevator) beats every nearby competitor's net price.
- **Amber** — Contested. The margin is thin — a small basis change by either side flips this farmer.
- **Red** — A competitor is winning. Their net price at this farmer's location is better than yours.

This is a continuous gradient, not a binary split. A deep green farmer is safely in your territory. A pale green farmer is technically yours but could flip. The color intensity maps directly to the competitive margin in cents.

The map also shows:
- **Your elevators** — Green markers
- **Competitor elevators** — Blue markers with tooltips showing their posted basis for the selected crop
- **Voronoi cell boundaries** — Dashed lines showing natural territory edges

### 4. Look Up Individual Farmers

A search bar below the bid model lets the merchant type a farmer's name and instantly see their calculated net bid price. This answers "If Johnson calls me right now, what am I offering him?" — factoring in his distance and the current bid model settings.

The search results show the farmer's name, acreage, the net bid they'd receive, and whether you're winning or losing them (and to whom).

### 5. Analyze Competitors

Clicking any blue competitor marker on the map opens the **Competitor Panel** with:

- **Facility metadata** — Operator name, location
- **Current posted bids** — Their basis for Corn, Soybeans, and Wheat
- **12-month trend chart** — A dual-line visualization showing your posted basis (green) vs. theirs (blue) over the past year. This tells the story: Are they getting more aggressive? Did you lose ground in January? Is the spread widening or tightening?

The trend chart uses 365 days of daily bid data, so the lines are smooth and realistic. The current spread (your basis minus theirs, in cents) is displayed at the top.

### 6. Manage Producers

The **Producer Panel** (right side) lists farmers in your selected elevator's territory, sorted and filterable. From here the merchant can:

- See estimated basis per farmer (interpolated by distance)
- Filter by contact recency ("haven't talked to in 30+ days")
- Filter by contact type (spot sales, calls, visits)
- Select farmers and send them to the originator dispatch queue for outreach

This connects the spatial competitive analysis to actual sales action.

---

## Key Design Decisions

### Why Floating Panels Over a Fixed Layout

Early iterations used a traditional sidebar layout — elevator list on the left, farmer list on the right, map squeezed in the middle. The problem: the map is the primary decision surface, and fixed sidebars were stealing space from it.

The current design makes the map full-bleed. Everything else floats over it as translucent panels that can be opened and closed. This gives the merchant maximum spatial context while keeping controls accessible. The bid model panel visually connects to the selected contract in the left panel, reinforcing the relationship.

### Why a Continuous Gradient Instead of Binary Win/Loss

An earlier version colored farmers either green (winning) or red (losing). This was accurate but not useful — it didn't tell the merchant *how much* they were winning or losing. A farmer you're winning by 8¢ and a farmer you're winning by 0.5¢ looked the same.

The gradient heatmap surfaces competitive pressure. The merchant can visually scan for clusters of amber/red and understand where their territory is vulnerable without reading individual numbers.

### Why Freight Matters So Much

The naive approach would be: compare posted bids and whoever's lower wins. But grain markets are intensely local. A farmer 3 miles from your elevator and 30 miles from a competitor will sell to you even if the competitor posts a tighter basis — the trucking cost erases the bid advantage.

The freight model makes this spatial reality visible. It's why a merchant can post a wider basis than a distant competitor and still win nearby farmers. It's also why the bid model has a freight parameter — different regions have different trucking costs, and the merchant knows their local market.

### Why Per-Contract Bid State

Bid settings persist per contract. When a merchant sets up the bid model for "Dec 2025 Corn" and then switches to "Jan 2026 Soybeans," their Corn settings are preserved. This matches reality — different delivery months and crops have different competitive dynamics and the merchant needs to model them independently.

### Why Daily Bid History

Monthly snapshots produced a chart with 12 dots connected by straight lines — not convincing and not useful. Daily resolution (365 data points per elevator per crop) produces smooth trend lines that actually tell a story. You can see seasonal patterns, reaction timing (one side moves, the other follows 3 days later), and gradual drift.

The data model also includes realistic touches: no changes on weekends (grain markets are closed), occasional larger "adjustment day" moves (~10% of days), and different volatility levels for different operators (user's own elevators adjust more slowly than competitors).

---

## Data Model Summary

| Entity | Count | Key Fields |
|--------|-------|------------|
| User elevators | 5 | Name, location, capacity |
| Competitor elevators | 120 | Name, operator, location (3 rings around territory) |
| Farmers | 2,000 | Name, location, acreage, preferred crop, originator |
| Contracts (positions) | 37 | Elevator, crop, delivery month, year |
| Daily bid records | ~137K | Date, CORN/SOYBEANS/WHEAT basis per elevator |

**Competitive calculation per frame:**
- For each visible farmer: compute net price from user's selected elevator, compute best net price from all competitors within range
- Distance via haversine formula (great-circle distance)
- ~2,000 farmers × ~120 competitors = ~240K distance calculations (optimized with memoization)

---

## What's Not Built Yet

- **Time scrubber** — Ability to rewind the map to see competitive positioning at a past date ("What did my territory look like in March?"). The daily data supports this; the UI control doesn't exist yet.
- **Multi-elevator view** — Currently scoped to one elevator at a time. A merchant managing 5 elevators needs to see the combined picture.
- **Position P&L integration** — Connecting bid decisions to actual position profit/loss (how much did I make on this contract given the basis I posted?).
- **Real data feeds** — Currently uses synthetic data. Production would pull from DTN/Barchart for futures, and the merchant's own ERP for posted bids and farmer transactions.
- **Originator workflow** — The "Send to Queue" button is wired but the downstream originator dispatch and tracking isn't built.
- **Alerts** — Automated notifications when a competitor changes their basis or when a farmer enters contested territory.
