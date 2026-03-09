// Generate ~500 farmers clustered around OUR elevators (Ames Main, Nevada Terminal)
// With density falloff — most farmers near our elevators, fewer at edges
// Run: npx tsx src/data/generate-farmers.ts > src/data/generated-farmers.ts

const FIRST_NAMES = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Dale', 'Roger', 'Larry', 'Dennis', 'Terry', 'Gerald', 'Keith', 'Wayne', 'Russell', 'Randy',
  'Dean', 'Allen', 'Eugene', 'Carl', 'Roy', 'Ralph', 'Earl', 'Howard', 'Fred', 'Raymond',
  'Donald', 'Kenneth', 'Steven', 'Edward', 'Brian', 'Mark', 'Daniel', 'Paul', 'Andrew', 'Scott',
  'Lyle', 'Duane', 'Vernon', 'Marvin', 'Glen', 'Merle', 'Harlan', 'Floyd', 'LeRoy', 'Virgil',
  'Mary', 'Patricia', 'Linda', 'Barbara', 'Susan', 'Dorothy', 'Karen', 'Nancy', 'Carol', 'Janet',
  'Donna', 'Sharon', 'Diane', 'Ruth', 'Jean', 'Janice', 'Beverly', 'Marlene', 'Bonnie', 'Shirley',
  'Ryan', 'Justin', 'Brandon', 'Tyler', 'Kyle', 'Cody', 'Travis', 'Dustin', 'Derek', 'Chad',
  'Aaron', 'Nathan', 'Trevor', 'Jake', 'Luke', 'Seth', 'Corey', 'Adam', 'Jesse', 'Brett',
  'Doug', 'Daryl', 'Craig', 'Greg', 'Jeff', 'Kirk', 'Neil', 'Wade', 'Clint', 'Troy',
]
const LAST_NAMES = [
  'Anderson', 'Nelson', 'Johnson', 'Petersen', 'Hansen', 'Larson', 'Olson', 'Sorensen', 'Christensen', 'Jensen',
  'Thompson', 'Miller', 'Schmidt', 'Weber', 'Schultz', 'Meyer', 'Fischer', 'Wagner', 'Becker', 'Hoffmann',
  'Mueller', 'Koch', 'Schroeder', 'Kramer', 'Brandt', 'Vogel', 'Keller', 'Richter', 'Klein', 'Wolf',
  'Carlson', 'Erickson', 'Swanson', 'Berg', 'Lindberg', 'Gustafson', 'Johansson', 'Strand', 'Holm', 'Lund',
  'Novak', 'Dvorak', 'Kriz', 'Svoboda', 'Hajek', 'Fitzpatrick', 'Murphy', 'Sullivan', 'Walsh', 'Brennan',
  'Rasmussen', 'Madsen', 'Bakke', 'Dahl', 'Iverson', 'Roth', 'Huber', 'Lang', 'Kraus', 'Braun',
  'Stenberg', 'Lindgren', 'Engstrom', 'Hedlund', 'Nordstrom', 'Sandberg', 'Sjoberg', 'Nystrom', 'Ekberg', 'Holmberg',
  'Whitaker', 'Harmon', 'Barrett', 'Crawford', 'Dawson', 'Powers', 'Garrett', 'Payne', 'Ramsey', 'Steele',
]

const NOTES = [
  'Reliable seller. Delivers on time.',
  'Watches basis closely. Will hold if spread is unfavorable.',
  'Large operation. Strategic account.',
  'New relationship. Building trust.',
  'Prefers evening calls.',
  'Sells in tranches, not all at once.',
  'Drought stress visible in satellite imagery. Motivated seller.',
  'Has on-farm storage. Less urgency.',
  'Cash sale preferred. Quick decisions.',
  'Price sensitive. Shops competitors.',
  'Family operation. Third generation.',
  'Expanding acreage. Growing account.',
  'Conservative seller. Locks in early.',
  'Waits for market rallies.',
  'Good relationship with Tyler. Easy to work with.',
  'Prefers text over phone calls.',
  'Recently expanded storage capacity.',
  'Split operation — corn and beans.',
  'Only sells corn. No soybeans.',
  'Landlord arrangement on 40% of acres.',
  'Delivered late last season. Monitor.',
  'High quality grain, premium eligible.',
  'Considering switching to competitor elevator.',
  'Young farmer, second year operating independently.',
  'Semi-retired, son manages day-to-day.',
  'Organic transition on 200 acres.',
  'Custom harvest operation, tight delivery windows.',
  'Active in local grain marketing club.',
  null, null, null, null, null,
]

// Seeded random for reproducibility
let _seed = 42
function rand() {
  _seed = (_seed * 16807 + 0) % 2147483647
  return _seed / 2147483647
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

// Gaussian-ish random using Box-Muller (clamped)
function gaussRand(mean: number, stddev: number): number {
  const u1 = rand()
  const u2 = rand()
  const z = Math.sqrt(-2 * Math.log(u1 + 0.0001)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stddev
}

// Our elevator locations — farmers cluster around these
const OWN_ELEVATORS = [
  { lat: 41.99, lng: -93.62, weight: 0.6 },  // Ames Main (bigger, more farmers)
  { lat: 42.02, lng: -93.45, weight: 0.4 },  // Nevada Terminal
]

// Originators covering Iowa Central territory
const ORIGINATORS = [
  { id: 'a1000000-0000-0000-0000-000000000010', name: 'Jake Morrison' },
  { id: 'a1000000-0000-0000-0000-000000000011', name: 'Lisa Tran' },
  { id: 'a1000000-0000-0000-0000-000000000012', name: 'Mike Sorensen' },
]

interface GeneratedFarmer {
  id: string
  name: string
  phone: string
  email: null
  salesforce_id: null
  region: string
  lat: number
  lng: number
  preferred_crop: 'CORN' | 'SOYBEANS'
  total_acres: number
  notes: string | null
  originator_id: string
}

const COUNT = 500
const farmers: GeneratedFarmer[] = []
const usedNames = new Set<string>()

for (let i = 0; i < COUNT; i++) {
  let name: string
  do {
    name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
  } while (usedNames.has(name))
  usedNames.add(name)

  // Pick which elevator to cluster around (weighted)
  const elev = rand() < OWN_ELEVATORS[0].weight ? OWN_ELEVATORS[0] : OWN_ELEVATORS[1]

  // Assign originator — geographic affinity: Jake near Ames, Lisa near Nevada, Mike fills gaps
  const distToAmes = Math.sqrt((elev.lat - 41.99) ** 2 + (elev.lng - (-93.62)) ** 2)
  const originator = distToAmes < 0.01 
    ? (rand() < 0.55 ? ORIGINATORS[0] : rand() < 0.5 ? ORIGINATORS[1] : ORIGINATORS[2])  // Ames cluster — Jake heavy
    : (rand() < 0.55 ? ORIGINATORS[1] : rand() < 0.5 ? ORIGINATORS[2] : ORIGINATORS[0])  // Nevada cluster — Lisa heavy

  // Gaussian distribution centered on elevator — most within ~15mi, some out to ~30mi
  // stddev ~0.15 degrees ≈ 10 miles
  const lat = +gaussRand(elev.lat, 0.15).toFixed(4)
  const lng = +gaussRand(elev.lng, 0.20).toFixed(4)

  const id = `c2000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`
  const preferred_crop = rand() > 0.35 ? 'CORN' as const : 'SOYBEANS' as const
  const total_acres = Math.round(200 + rand() * 3800)
  const areaCode = rand() > 0.5 ? '515' : '712'
  const phone = `${areaCode}-555-${String(1000 + i).padStart(4, '0')}`

  farmers.push({
    id, name, phone,
    email: null, salesforce_id: null,
    region: 'Iowa Central',
    lat, lng, preferred_crop, total_acres,
    notes: pick(NOTES),
    originator_id: originator.id,
  })
}

console.log(`import type { Farmer } from '@/types/kernel'

// ${COUNT} generated farmers in Iowa Central (Marcus Webb's territory)
// Clustered around Ames Main (60%) and Nevada Terminal (40%)
// Gaussian distribution — dense near elevators, thinning toward edges
// Generated from src/data/generate-farmers.ts

export const generatedFarmers: Farmer[] = ${JSON.stringify(farmers, null, 2)}
`)
