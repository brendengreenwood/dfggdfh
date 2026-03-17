// Generate ~2000 farmers across ALL 5 elevators in Marcus Webb's territory
// Weighted by elevator capacity, Gaussian clustered around each elevator
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
  'Wyatt', 'Caleb', 'Hunter', 'Logan', 'Mason', 'Colton', 'Tanner', 'Blake', 'Dalton', 'Bryce',
  'Clayton', 'Garrett', 'Mitchell', 'Spencer', 'Grant', 'Tucker', 'Brady', 'Riley', 'Chance', 'Lane',
  'Darrell', 'Curtis', 'Ronnie', 'Gene', 'Harvey', 'Melvin', 'Leon', 'Lloyd', 'Clifford', 'Herman',
  'Elmer', 'Wilbur', 'Orville', 'Lester', 'Norman', 'Luther', 'Myron', 'Alvin', 'Cecil', 'Oscar',
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
  'Cunningham', 'Porter', 'Spencer', 'Tucker', 'Morrison', 'Burton', 'Holland', 'Dixon', 'Fletcher', 'Marsh',
  'Holt', 'Warner', 'Gibbs', 'Drake', 'Barton', 'Owens', 'Bowen', 'Sharp', 'Moody', 'Pruitt',
  'Yoder', 'Troyer', 'Hershberger', 'Swartzentruber', 'Helmuth', 'Bontrager', 'Graber', 'Weaver', 'Detweiler', 'Schlabach',
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
  'Runs cattle too. Retains some corn for feed.',
  'CRP ground coming back into production next year.',
  'Tile drainage project completed — expecting yield bump.',
  'Cover crop program participant.',
  'FSA loan, needs to sell at harvest.',
  'Strong balance sheet, can wait for price.',
  'Trucking is a bottleneck — needs scheduling.',
  null, null, null, null, null, null, null,
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

// All 5 elevators — weighted by capacity
const OWN_ELEVATORS = [
  { lat: 41.99, lng: -93.62, weight: 0.25, stdLat: 0.18, stdLng: 0.22, areaCode: '515' },  // Ames Main — 2.5M bu
  { lat: 42.02, lng: -93.45, weight: 0.18, stdLat: 0.15, stdLng: 0.20, areaCode: '515' },  // Nevada Terminal — 1.8M bu
  { lat: 41.40, lng: -95.01, weight: 0.30, stdLat: 0.20, stdLng: 0.25, areaCode: '712' },  // Atlantic Main — 3.2M bu (biggest)
  { lat: 41.65, lng: -95.33, weight: 0.15, stdLat: 0.14, stdLng: 0.18, areaCode: '712' },  // Harlan Station — 1.4M bu
  { lat: 41.00, lng: -95.23, weight: 0.12, stdLat: 0.12, stdLng: 0.16, areaCode: '712' },  // Red Oak Depot — 900K bu
]

// Originators — 3 in Iowa Central, 3 in Iowa Southwest
const ORIGINATORS = [
  { id: 'a1000000-0000-0000-0000-000000000010', name: 'Jake Morrison', region: 'central' },
  { id: 'a1000000-0000-0000-0000-000000000011', name: 'Lisa Tran', region: 'central' },
  { id: 'a1000000-0000-0000-0000-000000000012', name: 'Mike Sorensen', region: 'both' },
  { id: 'a1000000-0000-0000-0000-000000000013', name: 'Sarah Brandt', region: 'southwest' },
  { id: 'a1000000-0000-0000-0000-000000000014', name: 'Tom Rasmussen', region: 'southwest' },
  { id: 'a1000000-0000-0000-0000-000000000015', name: 'Amy Lindgren', region: 'southwest' },
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

const COUNT = 2000
const farmers: GeneratedFarmer[] = []
const usedNames = new Set<string>()

for (let i = 0; i < COUNT; i++) {
  let name: string
  do {
    name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
  } while (usedNames.has(name))
  usedNames.add(name)

  // Pick which elevator to cluster around (weighted)
  const r = rand()
  let cumWeight = 0
  let elevIdx = 0
  for (let e = 0; e < OWN_ELEVATORS.length; e++) {
    cumWeight += OWN_ELEVATORS[e].weight
    if (r < cumWeight) { elevIdx = e; break }
  }
  const elev = OWN_ELEVATORS[elevIdx]

  // Assign originator by region
  const isCentral = elevIdx <= 1
  const isSouthwest = elevIdx >= 2
  let originator
  if (isCentral) {
    // Jake and Lisa cover central, Mike floats
    const or = rand()
    originator = or < 0.45 ? ORIGINATORS[0] : or < 0.85 ? ORIGINATORS[1] : ORIGINATORS[2]
  } else if (isSouthwest) {
    // Sarah, Tom, Amy cover southwest, Mike floats
    const or = rand()
    originator = or < 0.35 ? ORIGINATORS[3] : or < 0.65 ? ORIGINATORS[4] : or < 0.90 ? ORIGINATORS[5] : ORIGINATORS[2]
  } else {
    originator = pick(ORIGINATORS)
  }

  // Gaussian distribution centered on elevator
  const lat = +gaussRand(elev.lat, elev.stdLat).toFixed(4)
  const lng = +gaussRand(elev.lng, elev.stdLng).toFixed(4)

  const region = isCentral ? 'Iowa Central' : 'Iowa Southwest'
  const id = `c2000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`
  const preferred_crop = rand() > 0.35 ? 'CORN' as const : 'SOYBEANS' as const
  const total_acres = Math.round(200 + rand() * 3800)
  const phone = `${elev.areaCode}-555-${String(1000 + i).padStart(4, '0')}`

  farmers.push({
    id, name, phone,
    email: null, salesforce_id: null,
    region, lat, lng, preferred_crop, total_acres,
    notes: pick(NOTES),
    originator_id: originator.id,
  })
}

console.log(`import type { Farmer } from '@/types/kernel'

// ${COUNT} generated farmers across Marcus Webb's full territory
// Distributed across all 5 elevators weighted by capacity:
//   Ames Main (25%), Nevada Terminal (18%), Atlantic Main (30%), Harlan Station (15%), Red Oak Depot (12%)
// Gaussian distribution — dense near elevators, thinning toward edges
// 6 originators: 2 central, 3 southwest, 1 floater
// Generated from src/data/generate-farmers.ts

export const generatedFarmers: Farmer[] = ${JSON.stringify(farmers, null, 2)}
`)
