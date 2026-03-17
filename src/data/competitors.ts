// Competitor elevators near Iowa Central (Marcus Webb's territory)
// Dense network + boundary refinement sites for high-resolution voronoi

export interface CompetitorElevator {
  id: string
  name: string
  operator: string
  lat: number
  lng: number
}

// Seeded random for reproducibility
let _seed = 99
function rand() {
  _seed = (_seed * 16807 + 0) % 2147483647
  return _seed / 2147483647
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

const OPERATORS = [
  'Landus Cooperative', 'Heartland Co-op', 'ADM', 'Bunge', 'AGP',
  'Farmers Cooperative', 'NEW Cooperative', 'West Central Co-op',
  'Ag Partners', 'Central Iowa Co-op', 'Prairie Grain',
  'Consolidated Grain', 'Green Plains', 'Poet Biorefining',
  'Gavilon', 'CHS Inc', 'Zen-Noh', 'Louis Dreyfus',
]

const TOWN_NAMES = [
  'Boone', 'Marshalltown', 'Ankeny', 'Webster City', 'Story City', 'Grinnell',
  'Perry', 'Eldora', 'Tama', 'Toledo', 'Newton', 'Indianola', 'Winterset',
  'Pella', 'Oskaloosa', 'Knoxville', 'Dallas Center', 'Adel', 'Waukee',
  'Huxley', 'Maxwell', 'Collins', 'Colo', 'Zearing', 'McCallsburg',
  'Cambridge', 'Kelley', 'Slater', 'Sheldahl', 'Elkhart', 'Bondurant',
  'Altoona', 'Mitchellville', 'Monroe', 'Prairie City', 'Montezuma',
  'Brooklyn', 'Victor', 'Marengo', 'Williamsburg', 'Belle Plaine',
  'Traer', 'Dysart', 'Gladbrook', 'Conrad', 'Grundy Center',
  'Reinbeck', 'Dike', 'New Hartford', 'Ackley', 'Iowa Falls',
  'Ellsworth', 'Jewell', 'Kamrar', 'Stanhope', 'Stratford',
  'Ogden', 'Grand Junction', 'Jefferson', 'Scranton', 'Glidden',
  'Carroll', 'Coon Rapids', 'Guthrie Center', 'Stuart', 'Dexter',
  'Earlham', 'Van Meter', 'De Soto', 'Redfield', 'Linden',
  'Radcliffe', 'Hubbard', 'Eldora South', 'Blairsburg', 'Woolstock',
  'Lehigh', 'Barnum', 'Burnside', 'Boxholm', 'Dana',
  'Pilot Mound', 'Dayton', 'Harcourt', 'Gowrie', 'Farnhamville',
  'Paton', 'Churdan', 'Lohrville', 'Lidderdale', 'Lanesboro',
  'Bayard', 'Jamaica', 'Dawson', 'Minburn', 'Woodward',
  'Luther', 'Bouton', 'Madrid', 'Woodward South', 'Granger',
  'Polk City', 'Saylorville', 'Johnston North', 'Urbandale West', 'Clive East',
  'Berwick', 'Clemons', 'Melbourne', 'Rhodes', 'State Center',
  'Ferguson', 'Gilman', 'Laurel', 'Haven', 'Marshalltown South',
  'Albion', 'Liscomb', 'Union', 'Whitten', 'Beaman',
  'Garwin', 'Clutier', 'Elberon', 'Keystone', 'Norway',
  'Watkins', 'Center Point', 'Prairieburg', 'Langworthy', 'Scotch Grove',
]

const SUFFIXES = ['Grain', 'Terminal', 'Elevator', 'Co-op', 'Ag Center', 'Feed & Grain', 'Storage', 'Depot']

// Generate competitors in a ring AROUND our territory
// Our elevators: Ames (41.99, -93.62), Nevada (42.02, -93.45)
// Place competitors at varying distances to create stepped borders

const competitors: CompetitorElevator[] = []
const usedTowns = new Set<string>()

// Ring 1: Close competitors (create tight border steps near our territory)
const RING1_COUNT = 40
const RING1_RADIUS_LAT = 0.20  // ~14 miles
const RING1_RADIUS_LNG = 0.27

// Ring 2: Medium distance (fill in the mesh)
const RING2_COUNT = 50
const RING2_RADIUS_LAT = 0.40  // ~28 miles
const RING2_RADIUS_LNG = 0.55

// Ring 3: Far competitors (outer boundary)
const RING3_COUNT = 30
const RING3_RADIUS_LAT = 0.65  // ~45 miles
const RING3_RADIUS_LNG = 0.85

const CENTER_LAT = 42.005  // midpoint of our elevators
const CENTER_LNG = -93.535

function generateRing(count: number, radiusLat: number, radiusLng: number, startIdx: number) {
  for (let i = 0; i < count; i++) {
    let town: string
    let attempts = 0
    do {
      town = pick(TOWN_NAMES)
      attempts++
    } while (usedTowns.has(town) && attempts < 200)
    if (attempts >= 200) town = `Site ${startIdx + i}`
    usedTowns.add(town)

    // Distribute around center with some randomness
    const angle = (i / count) * 2 * Math.PI + (rand() - 0.5) * 0.8
    const rLat = radiusLat * (0.7 + rand() * 0.6)
    const rLng = radiusLng * (0.7 + rand() * 0.6)

    competitors.push({
      id: `comp-${String(startIdx + i).padStart(3, '0')}`,
      name: `${town} ${pick(SUFFIXES)}`,
      operator: pick(OPERATORS),
      lat: +(CENTER_LAT + Math.cos(angle) * rLat).toFixed(4),
      lng: +(CENTER_LNG + Math.sin(angle) * rLng).toFixed(4),
    })
  }
}

generateRing(RING1_COUNT, RING1_RADIUS_LAT, RING1_RADIUS_LNG, 1)
generateRing(RING2_COUNT, RING2_RADIUS_LAT, RING2_RADIUS_LNG, RING1_COUNT + 1)
generateRing(RING3_COUNT, RING3_RADIUS_LAT, RING3_RADIUS_LNG, RING1_COUNT + RING2_COUNT + 1)

export const competitorElevators: CompetitorElevator[] = competitors

// ── Fake posted bids per competitor per crop ──
// Keyed by competitorId → cropType → posted bid in cents (positive = under futures)
// Range: 8-28¢ under futures — realistic for Iowa grain
// Competitors closer to our territory tend to bid more aggressively (higher posted)

export interface CompetitorBids {
  [competitorId: string]: {
    CORN: number
    SOYBEANS: number
    WHEAT: number
  }
}

// Reset seed for reproducible bid generation
_seed = 77

export const competitorBids: CompetitorBids = Object.fromEntries(
  competitors.map(c => {
    // Closer competitors (lower IDs = ring 1) bid more aggressively
    const idx = parseInt(c.id.replace('comp-', ''))
    const aggressiveness = idx <= 40 ? 1.2 : idx <= 90 ? 1.0 : 0.8

    return [c.id, {
      CORN: Math.round((10 + rand() * 16) * aggressiveness),
      SOYBEANS: Math.round((12 + rand() * 14) * aggressiveness),
      WHEAT: Math.round((8 + rand() * 18) * aggressiveness),
    }]
  })
)

// ── Historical bid data — daily resolution ──
// 365 days of posted bids per elevator per crop (Oct 1 2024 → Sep 30 2025)
// Small daily drift with occasional larger moves to simulate real market behavior

export interface DailyBidRecord {
  date: string    // ISO date e.g. '2024-10-01'
  CORN: number
  SOYBEANS: number
  WHEAT: number
}

export interface CompetitorHistoricalBids {
  [competitorId: string]: DailyBidRecord[]
}

export interface OwnElevatorHistoricalBids {
  [elevatorId: string]: DailyBidRecord[]
}

// Generate date strings from Oct 1 2024 → Sep 30 2025
const START_DATE = new Date('2024-10-01')
const DAYS = 365
const DATES: string[] = []
for (let d = 0; d < DAYS; d++) {
  const dt = new Date(START_DATE)
  dt.setDate(dt.getDate() + d)
  DATES.push(dt.toISOString().slice(0, 10))
}

function generateDailyHistory(
  startCorn: number, startSoy: number, startWheat: number,
  volatility: number, aggressiveness: number
): DailyBidRecord[] {
  let corn = startCorn, soy = startSoy, wheat = startWheat
  const history: DailyBidRecord[] = []

  for (let i = DAYS - 1; i >= 0; i--) {
    // Most days: small noise. ~10% chance of a larger move (basis adjustment day)
    const bigMove = rand() < 0.1
    const scale = bigMove ? 3 : 1
    const drift = (rand() - 0.45) * volatility * aggressiveness * scale
    const noise = () => Math.round((rand() - 0.5) * 2 * scale)

    corn = Math.max(3, Math.min(40, corn - Math.round(drift) + noise()))
    soy = Math.max(3, Math.min(40, soy - Math.round(drift * 0.8) + noise()))
    wheat = Math.max(3, Math.min(40, wheat - Math.round(drift * 0.6) + noise()))

    // Weekends: no change (carry forward Friday's bid)
    const day = new Date(DATES[i]).getDay()
    if (day === 0 || day === 6) {
      if (history.length > 0) {
        const prev = history[0]
        history.unshift({ date: DATES[i], CORN: prev.CORN, SOYBEANS: prev.SOYBEANS, WHEAT: prev.WHEAT })
      } else {
        history.unshift({ date: DATES[i], CORN: corn, SOYBEANS: soy, WHEAT: wheat })
      }
    } else {
      history.unshift({ date: DATES[i], CORN: corn, SOYBEANS: soy, WHEAT: wheat })
    }
  }

  return history
}

// Competitor daily history
_seed = 55

export const competitorBidHistory: CompetitorHistoricalBids = Object.fromEntries(
  competitors.map(c => {
    const idx = parseInt(c.id.replace('comp-', ''))
    const aggressiveness = idx <= 40 ? 1.2 : idx <= 90 ? 1.0 : 0.8
    const bids = competitorBids[c.id]
    return [c.id, generateDailyHistory(bids.CORN, bids.SOYBEANS, bids.WHEAT, 0.8, aggressiveness)]
  })
)

// Own elevator daily history — less volatile, slower to adjust
const OWN_ELEVATOR_SEEDS: { id: string; baseCorn: number; baseSoy: number; baseWheat: number }[] = [
  { id: 'b1000000-0000-0000-0000-000000000001', baseCorn: 15, baseSoy: 14, baseWheat: 12 },
  { id: 'b1000000-0000-0000-0000-000000000002', baseCorn: 13, baseSoy: 12, baseWheat: 10 },
  { id: 'b1000000-0000-0000-0000-000000000003', baseCorn: 18, baseSoy: 16, baseWheat: 14 },
  { id: 'b1000000-0000-0000-0000-000000000004', baseCorn: 14, baseSoy: 13, baseWheat: 11 },
  { id: 'b1000000-0000-0000-0000-000000000005', baseCorn: 11, baseSoy: 10, baseWheat: 9 },
]

_seed = 33

export const ownElevatorBidHistory: OwnElevatorHistoricalBids = Object.fromEntries(
  OWN_ELEVATOR_SEEDS.map(elev => [
    elev.id,
    generateDailyHistory(elev.baseCorn, elev.baseSoy, elev.baseWheat, 0.5, 1.0),
  ])
)
