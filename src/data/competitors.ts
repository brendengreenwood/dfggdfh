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
