import { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Filter, X, Wheat, Phone, MapPin, StickyNote, Users, ChevronUp, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTheme } from '@/hooks/useTheme'
import { LandscapeMap } from './LandscapeMap'
import { ProximityMap, computeProximity } from './ProximityMap'
import { BidTrendChart } from './BidTrendChart'
import type { FarmerContact } from '@/types/kernel'
import { competitorElevators, competitorBids, competitorBidHistory, ownElevatorBidHistory, type CompetitorElevator } from '@/data/competitors'
import { assignToSites, computeVoronoi, type VoronoiSite } from '@/lib/voronoi'
import { haversineMiles } from '@/lib/geo'
import type { CropType, DeliveryMonth, Elevator, Farmer, PositionSummary } from '@/types/kernel'

const CROP_LABELS: Record<CropType, string> = {
  CORN: 'Corn',
  SOYBEANS: 'Soybeans',
  WHEAT: 'Wheat',
  SORGHUM: 'Sorghum',
  OATS: 'Oats',
}

const MONTH_ORDER: Record<string, number> = {
  JAN: 1, MAR: 2, MAY: 3, JUL: 4, AUG: 5, SEP: 6, NOV: 7, DEC: 8,
}

const MONTH_SHORT: Record<string, string> = {
  JAN: 'Jan', MAR: 'Mar', MAY: 'May', JUL: 'Jul', AUG: 'Aug', SEP: 'Sep', NOV: 'Nov', DEC: 'Dec',
}

const EMPTY_FARMERS: Farmer[] = []
const EMPTY_SET = new Set<string>()

export function StrategyView() {
  const [searchParams] = useSearchParams()
  const { currentUser } = useCurrentUser()
  const { theme, isDark } = useTheme()
  // URL params pre-select elevator/contract but never lock the UI
  const initialElevatorId = searchParams.get('elevator')
  const initialCrop = searchParams.get('crop') as CropType | null
  const initialMonth = searchParams.get('month') as DeliveryMonth | null
  const initialYear = searchParams.get('year') ? Number(searchParams.get('year')) : null

  const [selectedElevatorId, setSelectedElevatorId] = useState<string | null>(initialElevatorId)
  const [activePositionId, setActivePositionId] = useState<string | null>(null)
  const [cropFilter, setCropFilter] = useState<CropType | null>(null) // sidebar list filter only
  const [didAutoSelect, setDidAutoSelect] = useState(false) // auto-select initial contract once

  const [elevators, setElevators] = useState<Elevator[]>([])
  const [allFarmers, setAllFarmers] = useState<Farmer[]>([])
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null)
  const [showCompetitors, setShowCompetitors] = useState(true)
  const [showFarmers, setShowFarmers] = useState(true)
  const [showVoronoi] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showArcs, setShowArcs] = useState(false)
  const [showHexagons, setShowHexagons] = useState(false)
  const [selectedFarmerIds, setSelectedFarmerIds] = useState<Set<string>>(new Set())
  const [focusedFarmer, setFocusedFarmer] = useState<Farmer | null>(null) // drill-down into farmer proximity on main map
  const [showProducerPanel, setShowProducerPanel] = useState(false)
  const [showCompetitorPanel, setShowCompetitorPanel] = useState(false)
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorElevator | null>(null)
  const [farmerSearch, setFarmerSearch] = useState('')
  const [farmerSearchFocused, setFarmerSearchFocused] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [bidPanelTop, setBidPanelTop] = useState(16)

  const [allPositions, setAllPositions] = useState<PositionSummary[]>([])
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  // Per-contract bid settings — persisted when switching between contracts
  type ContractBidState = { posted: number; leeway: number; freight: number }
  const [contractBids, setContractBids] = useState<Record<string, ContractBidState>>({})

  // Get or initialize bid state for the active contract
  const getContractBid = (posId: string, basis: number | null): ContractBidState => {
    if (contractBids[posId]) return contractBids[posId]
    // Initialize from the contract's current posted basis (convert to cents)
    return { posted: Math.round(Math.abs(basis ?? 0.15) * 100), leeway: 10, freight: 0.4 }
  }
  const updateContractBid = useCallback((posId: string, update: Partial<ContractBidState>) => {
    setContractBids(prev => {
      const existing = prev[posId] ?? { posted: 15, leeway: 10, freight: 0.4 }
      return { ...prev, [posId]: { ...existing, ...update } }
    })
  }, [])

  // Send selected farmers to originator dispatch queue
  const sendToQueue = async (farmerIds: string[]) => {
    if (!selectedElevatorId || farmerIds.length === 0) return
    setSendStatus('sending')
    try {
      const farmerSelections = farmerIds.map(id => {
        const f = territoryFarmers.find(tf => tf.id === id)
        return {
          farmerId: id,
          recommendedBasis: f?.estimatedBasis ?? null,
          estimatedBu: f ? (f.total_acres ?? 0) * 180 : 0,
          originatorId: f?.originator_id ?? null,
        }
      })

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmers: farmerSelections,
          elevatorId: selectedElevatorId,
          assignedTo: currentUser?.id,
          crop: selectedCrop ?? 'CORN',
          month: selectedMonth,
          year: selectedYear,
        }),
      })

      if (!res.ok) throw new Error('Failed to create leads')
      setSendStatus('sent')
      setSelectedFarmerIds(new Set())
      setTimeout(() => setSendStatus('idle'), 3000)
    } catch {
      setSendStatus('error')
      setTimeout(() => setSendStatus('idle'), 3000)
    }
  }

  // Fetch elevators and farmers from API
  useEffect(() => {
    fetch('/api/elevators')
      .then(r => r.json())
      .then(setElevators)
      .catch(() => {})
    fetch('/api/farmers')
      .then(r => r.json())
      .then(setAllFarmers)
      .catch(() => {})
  }, [])

  // Fetch all positions for the current user
  useEffect(() => {
    if (!currentUser?.id) {
      setAllPositions([])
      return
    }
    fetch(`/api/positions?userId=${currentUser.id}`)
      .then(r => r.json())
      .then((positions: PositionSummary[]) => setAllPositions(positions))
      .catch(() => setAllPositions([]))
  }, [currentUser?.id])

  // Derive currentPosition from activePositionId (or launched URL params)
  // Auto-select initial contract from URL params once positions load
  useEffect(() => {
    if (didAutoSelect || allPositions.length === 0 || !initialElevatorId) return
    const match = allPositions.find(p =>
      p.elevator_id === initialElevatorId &&
      (!initialMonth || p.delivery_month === initialMonth) &&
      (!initialCrop || p.crop === initialCrop) &&
      (!initialYear || p.crop_year === initialYear)
    )
    if (match) setActivePositionId(match.id)
    setDidAutoSelect(true)
  }, [allPositions, didAutoSelect, initialElevatorId, initialMonth, initialCrop, initialYear])

  const currentPosition = useMemo(() => {
    if (activePositionId) return allPositions.find(p => p.id === activePositionId) ?? null
    return null
  }, [allPositions, activePositionId])

  // Convenience: the active contract's crop/month (for map filtering, farmer visibility, etc.)
  const selectedCrop = currentPosition?.crop ?? null
  const selectedMonth = currentPosition?.delivery_month ?? null
  const selectedYear = currentPosition?.crop_year ?? null

  // Active contract bid state (drives map calculations and bid panel)
  const activeBid = currentPosition
    ? getContractBid(currentPosition.id, currentPosition.current_basis)
    : { posted: 15, leeway: 10, freight: 0.4 }
  const basisPrice = activeBid.posted
  const outerLeeway = activeBid.leeway
  const freightCost = activeBid.freight

  // Unique elevators the user has contracts at (derived from positions)
  const userElevators = useMemo(() => {
    const seen = new Map<string, Elevator>()
    for (const p of allPositions) {
      if (p.elevator && !seen.has(p.elevator_id)) seen.set(p.elevator_id, p.elevator)
    }
    return Array.from(seen.values())
  }, [allPositions])

  // Filter positions by selected elevator + crop filter for the sidebar list, sorted by month
  const filteredPositions = useMemo(() => {
    let filtered = allPositions
    if (selectedElevatorId) filtered = filtered.filter(p => p.elevator_id === selectedElevatorId)
    if (cropFilter) filtered = filtered.filter(p => p.crop === cropFilter)
    return [...filtered].sort((a, b) => {
      if (a.crop_year !== b.crop_year) return a.crop_year - b.crop_year
      return (MONTH_ORDER[a.delivery_month] ?? 99) - (MONTH_ORDER[b.delivery_month] ?? 99)
    })
  }, [allPositions, selectedElevatorId, cropFilter])

  // Unique crops present at the selected elevator (for crop filter pills)
  const availableCrops = useMemo(() => {
    const elevatorPositions = selectedElevatorId
      ? allPositions.filter(p => p.elevator_id === selectedElevatorId)
      : allPositions
    const crops = new Set(elevatorPositions.map(p => p.crop))
    return Object.keys(CROP_LABELS).filter(c => crops.has(c as CropType)) as CropType[]
  }, [allPositions, selectedElevatorId])

  // Select a contract from the sidebar
  const selectPosition = (pos: PositionSummary) => {
    setActivePositionId(pos.id)
  }

  const selectedElevator = selectedElevatorId
    ? elevators.find(e => e.id === selectedElevatorId)
    : null

  // Filter farmers by crop if selected
  const visibleFarmers = selectedCrop
    ? allFarmers.filter(f => f.preferred_crop === selectedCrop)
    : allFarmers

  // Build voronoi sites for both cell assignment and polygon extraction
  const voronoiSites = useMemo((): VoronoiSite[] => [
    ...elevators
      .filter(e => e.lat != null && e.lng != null)
      .map(e => ({ id: e.id, lat: e.lat!, lng: e.lng!, isOwn: true })),
    ...competitorElevators.map(c => ({ id: c.id, lat: c.lat, lng: c.lng, isOwn: false })),
  ], [elevators])

  const voronoiBounds = useMemo(() => (
    { minLng: -96.5, maxLng: -92.0, minLat: 40.5, maxLat: 43.0 }
  ), [])

  // Natural voronoi cell polygon for the selected elevator (freight-indifference boundary)
  const selectedCellPolygon = useMemo(() => {
    if (!selectedElevatorId || voronoiSites.length < 3) return null
    const cells = computeVoronoi(voronoiSites, voronoiBounds)
    return cells.find(c => c.site.id === selectedElevatorId)?.polygon ?? null
  }, [selectedElevatorId, voronoiSites, voronoiBounds])

  // Expanded voronoi cell — recompute with competitors pushed away proportional to outerLeeway
  // More aggressive bid = competitors effectively further away = our cell grows
  const expandedCellPolygon = useMemo(() => {
    if (!selectedElevatorId || voronoiSites.length < 3 || outerLeeway <= 0) return null
    const selElev = elevators.find(e => e.id === selectedElevatorId)
    if (!selElev?.lat || !selElev?.lng) return null

    // Push each competitor away from own elevator proportional to outerLeeway
    // outerLeeway in cents → geographic offset (roughly 0.005 degrees per cent ≈ 0.35 mi/cent)
    const pushFactor = outerLeeway * 0.005
    const weightedSites: VoronoiSite[] = voronoiSites.map(s => {
      if (s.isOwn) return s
      // Direction from own elevator to competitor
      const dLng = s.lng - selElev.lng!
      const dLat = s.lat - selElev.lat!
      const dist = Math.sqrt(dLng * dLng + dLat * dLat)
      if (dist < 0.001) return s
      // Push competitor outward along that direction
      return {
        ...s,
        lng: s.lng + (dLng / dist) * pushFactor,
        lat: s.lat + (dLat / dist) * pushFactor,
      }
    })

    const cells = computeVoronoi(weightedSites, voronoiBounds)
    return cells.find(c => c.site.id === selectedElevatorId)?.polygon ?? null
  }, [selectedElevatorId, voronoiSites, voronoiBounds, outerLeeway, elevators])

  // Freight cost model: cents per mile (per-contract, adjustable by merchant)
  const FREIGHT_CENTS_PER_MILE = freightCost

  // Distance-based farmer reachability:
  // - Farmers inside natural cell: always reachable (freight advantage)
  // - Farmers outside cell: reachable when outerLeeway covers their freight disadvantage
  //   freightDisadvantage = (distToOwnElev - distToNearestCompetitor) × FREIGHT_CENTS_PER_MILE
  //   reachable when outerLeeway >= freightDisadvantage
  const cellFarmers = useMemo(() => {
    if (!selectedElevatorId || voronoiSites.length === 0) return []

    const selElev = elevators.find(e => e.id === selectedElevatorId)
    if (!selElev?.lat || !selElev?.lng) return []

    // Get natural cell membership via voronoi assignment
    const points = visibleFarmers
      .filter(f => f.lat != null && f.lng != null)
      .map(f => ({ id: f.id, lat: f.lat!, lng: f.lng! }))
    const assignment = assignToSites(voronoiSites, points)
    const naturalIds = new Set(assignment.get(selectedElevatorId) ?? [])

    // Competitor positions for freight disadvantage calculation
    const competitorSites = voronoiSites.filter(s => !s.isOwn)

    return visibleFarmers
      .filter(f => {
        if (f.lat == null || f.lng == null) return false
        // Inside natural cell — always reachable
        if (naturalIds.has(f.id)) return true
        // Outside cell — check if outerLeeway covers freight disadvantage
        const distToOwn = haversineMiles(f.lat, f.lng, selElev.lat!, selElev.lng!)
        let minCompDist = Infinity
        for (const c of competitorSites) {
          minCompDist = Math.min(minCompDist, haversineMiles(f.lat, f.lng, c.lat, c.lng))
        }
        const freightDisadvantage = (distToOwn - minCompDist) * FREIGHT_CENTS_PER_MILE
        return outerLeeway >= freightDisadvantage
      })
      .map(f => ({
        ...f,
        distance: haversineMiles(f.lat!, f.lng!, selElev.lat!, selElev.lng!),
        inNaturalCell: naturalIds.has(f.id),
      }))
  }, [selectedElevatorId, voronoiSites, elevators, visibleFarmers, outerLeeway])

  // Derived bid values: symmetric leeway around posted basis
  const minBid = basisPrice - outerLeeway  // tightest bid (at elevator)
  const maxBid = basisPrice + outerLeeway  // widest bid (at/beyond cell edge)
  const totalSpread = outerLeeway * 2
  const tierCount = Math.max(1, Math.round(totalSpread / 3))
  const territoryFarmers = useMemo(() => {
    const selElev = elevators.find(e => e.id === selectedElevatorId)
    if (!selElev?.lat || !selElev?.lng) return cellFarmers.map(f => ({ ...f, estimatedBasis: -basisPrice / 100, tierIndex: 0 }))

    const maxDist = cellFarmers.reduce((m, f) => Math.max(m, f.distance ?? 0), 0) || 1

    return cellFarmers
      .map(f => {
        const depth = f.distance != null ? f.distance / maxDist : 1
        // Interpolate: 0 (at elevator) → minBid, 1 (farthest) → maxBid
        const bidCents = minBid + (maxBid - minBid) * depth
        const estimatedBasis = -(bidCents / 100)
        const tierIndex = Math.min(tierCount - 1, Math.floor(depth * tierCount))
        return { ...f, estimatedBasis, tierIndex }
      })
      .sort((a, b) => a.estimatedBasis - b.estimatedBasis)
  }, [cellFarmers, minBid, maxBid, tierCount, basisPrice, elevators, selectedElevatorId])

  // ── Competitive analysis: who wins each farmer? ──
  // For each visible farmer, compute net price from user's elevator vs all competitors
  // Net price = posted bid - (freight × distance to elevator)
  // The elevator with the highest net price wins the farmer

  const cropKey = (selectedCrop ?? 'CORN') as keyof typeof competitorBids[string]

  const farmerWins = useMemo(() => {
    const wins = new Map<string, { winner: 'own' | 'competitor'; margin: number; competitorName?: string; netBid: number; targetLat: number; targetLng: number }>()
    if (!selectedElevatorId) return wins

    const selElev = elevators.find(e => e.id === selectedElevatorId)
    if (!selElev?.lat || !selElev?.lng) return wins

    // User's net price for each farmer: posted bid - freight cost
    const userPosted = basisPrice // cents under futures

    visibleFarmers.forEach(f => {
      if (f.lat == null || f.lng == null) return

      // User's net price at this farmer's location
      const distToUser = haversineMiles(f.lat, f.lng, selElev.lat!, selElev.lng!)
      const userNetPrice = userPosted - (distToUser * FREIGHT_CENTS_PER_MILE)

      // Best competitor net price
      let bestCompNet = -Infinity
      let bestCompName = ''
      let bestCompLat = 0
      let bestCompLng = 0
      for (const comp of competitorElevators) {
        const compBids = competitorBids[comp.id]
        if (!compBids) continue
        const compPosted = compBids[cropKey] ?? 15
        const distToComp = haversineMiles(f.lat, f.lng, comp.lat, comp.lng)
        const compNetPrice = compPosted - (distToComp * FREIGHT_CENTS_PER_MILE)
        if (compNetPrice > bestCompNet) {
          bestCompNet = compNetPrice
          bestCompName = `${comp.name} (${comp.operator})`
          bestCompLat = comp.lat
          bestCompLng = comp.lng
        }
      }

      const margin = userNetPrice - bestCompNet // positive = we win
      const isOwn = margin >= 0
      wins.set(f.id, {
        winner: isOwn ? 'own' : 'competitor',
        margin,
        competitorName: isOwn ? undefined : bestCompName,
        netBid: userNetPrice,
        targetLat: isOwn ? selElev.lat! : bestCompLat,
        targetLng: isOwn ? selElev.lng! : bestCompLng,
      })
    })

    return wins
  }, [selectedElevatorId, elevators, visibleFarmers, basisPrice, FREIGHT_CENTS_PER_MILE, cropKey])

  // Farmer net bid prices for tooltips
  const farmerBids = useMemo(() => {
    const m = new Map<string, number>()
    farmerWins.forEach((w, id) => m.set(id, w.netBid))
    return m
  }, [farmerWins])

  // Farmer win data for deck.gl visualization layers (heatmap, arcs, hexagons)
  const farmerWinData = useMemo(() => {
    if (farmerWins.size === 0) return []
    const result: import('./LandscapeMap').FarmerWinData[] = []
    visibleFarmers.forEach(f => {
      if (f.lat == null || f.lng == null) return
      const w = farmerWins.get(f.id)
      if (!w) return
      result.push({
        id: f.id,
        lat: f.lat,
        lng: f.lng,
        acres: f.total_acres ?? 500,
        winner: w.winner,
        margin: w.margin,
        targetLat: w.targetLat,
        targetLng: w.targetLng,
      })
    })
    return result
  }, [visibleFarmers, farmerWins])

  // Farmer search results — match by name, return with bid price
  const farmerSearchResults = useMemo(() => {
    if (!farmerSearch.trim() || farmerSearch.trim().length < 2) return []
    const q = farmerSearch.toLowerCase()
    return visibleFarmers
      .filter(f => f.name.toLowerCase().includes(q))
      .slice(0, 8)
      .map(f => ({
        ...f,
        netBid: farmerBids.get(f.id) ?? null,
        win: farmerWins.get(f.id) ?? null,
      }))
  }, [farmerSearch, visibleFarmers, farmerBids, farmerWins])

  // Build color map: continuous heat gradient based on competitive pressure
  // Deep green (safe) → amber (contested) → red (losing)
  // Margin drives position on the spectrum: big positive = green, zero = amber, negative = red
  const farmerColors = useMemo(() => {
    const map = new Map<string, string>()
    if (farmerWins.size === 0) {
      visibleFarmers.forEach(f => map.set(f.id, isDark ? '#94a3b8' : '#64748b'))
      return map
    }

    // Find max absolute margin for normalization
    let maxMargin = 0
    farmerWins.forEach(w => { maxMargin = Math.max(maxMargin, Math.abs(w.margin)) })
    if (maxMargin === 0) maxMargin = 1

    farmerWins.forEach((w, farmerId) => {
      // t: -1 (deep loss) → 0 (toss-up) → +1 (safe win)
      const t = Math.max(-1, Math.min(1, w.margin / maxMargin))

      let r: number, g: number, b: number
      if (t >= 0) {
        // Green → Amber: lerp (245,158,11) at t=0  →  (74,222,128) at t=1
        r = Math.round(245 - 171 * t)   // 245 → 74
        g = Math.round(158 + 64 * t)    // 158 → 222
        b = Math.round(11 + 117 * t)    // 11  → 128
      } else {
        // Amber → Red: lerp (245,158,11) at t=0  →  (239,68,68) at t=-1
        const s = -t // 0 → 1
        r = Math.round(245 - 6 * s)     // 245 → 239
        g = Math.round(158 - 90 * s)    // 158 → 68
        b = Math.round(11 + 57 * s)     // 11  → 68
      }
      map.set(farmerId, `rgb(${r},${g},${b})`)
    })

    return map
  }, [farmerWins, visibleFarmers, isDark])

  // Competitive summary stats
  const competitiveStats = useMemo(() => {
    let ownWins = 0, compWins = 0, ownAcres = 0, compAcres = 0
    farmerWins.forEach((w, farmerId) => {
      const f = visibleFarmers.find(vf => vf.id === farmerId)
      const acres = f?.total_acres ?? 0
      if (w.winner === 'own') { ownWins++; ownAcres += acres }
      else { compWins++; compAcres += acres }
    })
    return { ownWins, compWins, ownAcres, compAcres }
  }, [farmerWins, visibleFarmers])

  const territoryAcres = useMemo(
    () => territoryFarmers.reduce((sum, f) => sum + (f.total_acres ?? 0), 0),
    [territoryFarmers]
  )

  // Memoize reachable farmer IDs (outside natural cell but within freight range)
  const reachableFarmerIds = useMemo(
    () => new Set(cellFarmers.filter(f => !f.inNaturalCell).map(f => f.id)),
    [cellFarmers]
  )

  // Compute proximity data for the drilled-in farmer (drives LandscapeMap proximity view)
  const focusedProximity = useMemo(() => {
    if (!focusedFarmer) return null
    const prox = computeProximity(focusedFarmer, elevators, competitorElevators)
    if (!prox) return null
    return { farmer: focusedFarmer, ...prox }
  }, [focusedFarmer, elevators, competitorElevators])

  // Stable callbacks for map interactions
  const handleFarmerClick = useCallback((f: Farmer) => setSelectedFarmer(f), [])
  const handleCompetitorClick = useCallback((c: CompetitorElevator) => {
    setSelectedCompetitor(c)
    setShowCompetitorPanel(true)
  }, [])

  // Stable callbacks for BidSetupPanel
  const handlePostedChange = useCallback((v: number) => {
    if (currentPosition) updateContractBid(currentPosition.id, { posted: v })
  }, [currentPosition, updateContractBid])
  const handleLeewayChange = useCallback((v: number) => {
    if (currentPosition) updateContractBid(currentPosition.id, { leeway: v })
  }, [currentPosition, updateContractBid])
  const handleFreightChange = useCallback((v: number) => {
    if (currentPosition) updateContractBid(currentPosition.id, { freight: v })
  }, [currentPosition, updateContractBid])
  const handleBidPanelClose = useCallback(() => setActivePositionId(null), [])

  // Stable callbacks for FarmerDetailPanel
  const handleFarmerDetailClose = useCallback(() => setSelectedFarmer(null), [])
  const handleFarmerDrillDown = useCallback(() => setFocusedFarmer(selectedFarmer), [selectedFarmer])
  const handleFarmerDetailSend = useCallback(() => {
    if (selectedFarmer) sendToQueue([selectedFarmer.id])
  }, [selectedFarmer])

  // Stable callbacks for TerritoryFarmerList
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedFarmerIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const handleSelectAll = useCallback(() => {
    setSelectedFarmerIds(new Set(territoryFarmers.map(f => f.id)))
  }, [territoryFarmers])
  const handleClearSelection = useCallback(() => setSelectedFarmerIds(EMPTY_SET), [])
  const handleSendToQueue = useCallback((ids: string[]) => sendToQueue(ids), [])

  // Stable empty farmers array
  const mapFarmers = showFarmers ? visibleFarmers : EMPTY_FARMERS

  return (
    <div className="h-[calc(100vh-2rem)] relative" data-testid="strategy-view">
      {/* Map area — full bleed, everything floats over it */}
      <div ref={mapContainerRef} className="absolute inset-0 overflow-hidden">
        <LandscapeMap
          elevators={elevators}
          farmers={mapFarmers}
          selectedElevatorId={selectedElevatorId}
          onFarmerClick={handleFarmerClick}
          onCompetitorClick={handleCompetitorClick}
          minBid={minBid}
          maxBid={maxBid}
          tierCount={tierCount}
          selectedCellPolygon={selectedCellPolygon}
          expandedCellPolygon={expandedCellPolygon}
          farmerColors={farmerColors}
          farmerBids={farmerBids}
          focusedProximity={focusedProximity}
          reachableFarmerIds={reachableFarmerIds}
          showVoronoi={showVoronoi}
          showCompetitors={showCompetitors}
          showHeatmap={showHeatmap}
          showArcs={showArcs}
          showHexagons={showHexagons}
          farmerWinData={farmerWinData}
          cropKey={cropKey}
          theme={theme}
        />

        {/* Floating Contracts Panel — left side over map */}
        <div className="absolute top-4 left-4 z-[1000] w-52 max-h-[calc(100%-2rem)] rounded-lg bg-card/95 backdrop-blur border border-border flex flex-col shadow-xl overflow-hidden" data-testid="positions-sidebar">
          {/* Elevator selector */}
          <div className="p-3 border-b border-border space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Elevator</span>
            <select
              value={selectedElevatorId ?? ''}
              onChange={e => {
                const val = e.target.value || null
                setSelectedElevatorId(val)
                setActivePositionId(null)
                setCropFilter(null)
              }}
              className="w-full text-xs h-8 rounded-md border border-input bg-transparent px-2 text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
              style={{ colorScheme: isDark ? 'dark' : 'light' }}
            >
              <option value="">Select elevator…</option>
              {userElevators.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          {/* Crop filter */}
          {selectedElevatorId && availableCrops.length > 0 && (
            <div className="px-3 py-2 border-b border-border">
              {availableCrops.length > 3 ? (
                <select
                  value={cropFilter ?? ''}
                  onChange={e => setCropFilter((e.target.value || null) as CropType | null)}
                  className="w-full text-xs h-7 rounded-md border border-input bg-transparent px-2 text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
                  style={{ colorScheme: isDark ? 'dark' : 'light' }}
                >
                  {availableCrops.map(crop => (
                    <option key={crop} value={crop}>{CROP_LABELS[crop]}</option>
                  ))}
                </select>
              ) : (
                <div className="flex gap-1">
                  {availableCrops.map(crop => (
                    <button
                      key={crop}
                      onClick={() => setCropFilter(prev => prev === crop ? null : crop)}
                      className={cn(
                        'flex-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors text-center',
                        cropFilter === crop
                          ? 'bg-green-500/15 text-green-400 border border-green-500/40'
                          : 'bg-secondary text-muted-foreground border border-transparent hover:border-border'
                      )}
                    >
                      {CROP_LABELS[crop]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contracts list */}
          <div className="flex-1 overflow-auto">
            <div className="p-2 space-y-1">
              {!selectedElevatorId && (
                <p className="text-xs text-muted-foreground p-3 text-center">Select an elevator to view contracts</p>
              )}
              {selectedElevatorId && filteredPositions.length === 0 && (
                <p className="text-xs text-muted-foreground p-3 text-center">No contracts</p>
              )}
              {selectedElevatorId && filteredPositions.map(pos => {
                const isActive = pos.id === activePositionId
                const postedBasis = pos.current_basis

                return (
                  <button
                    key={pos.id}
                    onClick={(e) => {
                      selectPosition(pos)
                      const mapEl = mapContainerRef.current
                      if (mapEl) {
                        const mapRect = mapEl.getBoundingClientRect()
                        const btnRect = e.currentTarget.getBoundingClientRect()
                        setBidPanelTop(Math.max(16, btnRect.top - mapRect.top))
                      }
                    }}
                    className={cn(
                      'w-full text-left rounded-md px-2 py-1.5 transition-all',
                      isActive
                        ? 'bg-green-500/10 border border-green-500/40'
                        : 'border border-transparent hover:bg-secondary/60 hover:border-border'
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-semibold text-foreground shrink-0">
                        {MONTH_SHORT[pos.delivery_month] ?? pos.delivery_month} '{String(pos.crop_year).slice(-2)}
                      </span>
                      {!cropFilter && (
                        <span className="text-[10px] text-muted-foreground truncate">{CROP_LABELS[pos.crop]}</span>
                      )}
                      {postedBasis != null && (
                        <span className="text-[10px] font-mono font-medium text-foreground shrink-0">
                          {postedBasis < 0 ? '' : '+'}{postedBasis.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Floating Bid Menu + Farmer Search — positioned to right of contracts panel */}
        <div
          className={cn(
            'absolute left-56 z-[1000] flex flex-col gap-2 transition-all duration-200 ease-out',
            selectedElevatorId && currentPosition && !focusedFarmer
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none'
          )}
          style={{ top: bidPanelTop }}
        >
            {currentPosition && (
              <BidSetupPanel
                position={currentPosition}
                elevator={selectedElevator}
                posted={basisPrice}
                leeway={outerLeeway}
                freight={freightCost}
                onPostedChange={handlePostedChange}
                onLeewayChange={handleLeewayChange}
                onFreightChange={handleFreightChange}
                onClose={handleBidPanelClose}
              />
            )}

            {/* Farmer price lookup */}
            <div ref={searchRef} className="w-56 relative">
              <div className="flex items-center rounded-lg bg-card/95 backdrop-blur border border-border shadow-lg px-2.5 py-1.5 gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Look up farmer price…"
                  value={farmerSearch}
                  onChange={e => setFarmerSearch(e.target.value)}
                  onFocus={() => setFarmerSearchFocused(true)}
                  onBlur={(e) => {
                    // delay close so click on result can fire
                    if (!searchRef.current?.contains(e.relatedTarget as Node)) {
                      setTimeout(() => setFarmerSearchFocused(false), 150)
                    }
                  }}
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                />
                {farmerSearch && (
                  <button onClick={() => { setFarmerSearch(''); setFarmerSearchFocused(false) }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Search results dropdown */}
              {farmerSearchFocused && farmerSearch.trim().length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg bg-card/95 backdrop-blur border border-border shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                  {farmerSearchResults.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No farmers found</div>
                  ) : (
                    farmerSearchResults.map(f => (
                      <button
                        key={f.id}
                        className="w-full px-3 py-2 text-left hover:bg-secondary/50 transition-colors border-b border-border/50 last:border-0"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setSelectedFarmer(f)
                          setFarmerSearch('')
                          setFarmerSearchFocused(false)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground truncate">{f.name}</span>
                          {f.netBid != null && (
                            <span
                              className="text-xs font-mono font-semibold ml-2 shrink-0"
                              style={{ color: farmerColors.get(f.id) ?? (isDark ? '#94a3b8' : '#64748b') }}
                            >
                              -${(f.netBid / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {f.total_acres?.toLocaleString()} ac
                          {f.win?.winner === 'competitor' && f.win.competitorName && (
                            <span className="text-red-400/70"> · losing to {f.win.competitorName}</span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

        {/* Back button when drilled into proximity view */}
        {focusedFarmer && (
          <button
            onClick={() => setFocusedFarmer(null)}
            className="absolute top-4 left-56 z-[1000] flex items-center gap-2 rounded-lg bg-card/90 backdrop-blur border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors shadow-lg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to territory
          </button>
        )}

        {/* Panel toggle buttons — top-right */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => setShowCompetitorPanel(v => !v)}
            className={cn(
              'rounded-lg px-3 py-2 text-xs font-medium shadow-lg backdrop-blur transition-all',
              showCompetitorPanel
                ? 'bg-red-500/15 border border-red-500/40 text-red-400'
                : 'bg-card/90 border border-border text-foreground hover:bg-secondary'
            )}
          >
            {showCompetitorPanel ? 'Close' : 'Open'} Competitor Panel
          </button>
          <button
            onClick={() => setShowProducerPanel(v => !v)}
            className={cn(
              'rounded-lg px-3 py-2 text-xs font-medium shadow-lg backdrop-blur transition-all',
              showProducerPanel
                ? 'bg-green-500/15 border border-green-500/40 text-green-400'
                : 'bg-card/90 border border-border text-foreground hover:bg-secondary'
            )}
          >
            {showProducerPanel ? 'Close' : 'Open'} Producer Panel
          </button>
        </div>

        {/* Freight advantage badge when drilled in */}
        {focusedFarmer && focusedProximity && (
          <div className="absolute bottom-14 left-4 z-[1000]">
            {focusedProximity.advantage > 0 ? (
              <div className="rounded-lg bg-green-500/10 backdrop-blur border border-green-500/30 px-4 py-2.5 text-sm text-green-400 font-semibold shadow-lg">
                +{focusedProximity.advantage.toFixed(1)} mi freight advantage
              </div>
            ) : (
              <div className="rounded-lg bg-red-500/10 backdrop-blur border border-red-500/30 px-4 py-2.5 text-sm text-red-400 font-semibold shadow-lg">
                {focusedProximity.advantage.toFixed(1)} mi freight disadvantage
              </div>
            )}
          </div>
        )}

        {/* Layer toggles — bottom-center */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex gap-1 flex-wrap justify-center">
          {[
            { label: 'Producers', checked: showFarmers, toggle: () => setShowFarmers(v => !v), color: '#f59e0b' },
            { label: 'Competitors', checked: showCompetitors, toggle: () => setShowCompetitors(v => !v), color: '#3b82f6' },
            { label: 'Heatmap', checked: showHeatmap, toggle: () => setShowHeatmap(v => !v), color: '#ef4444' },
            { label: 'Grain Flow', checked: showArcs, toggle: () => setShowArcs(v => !v), color: '#22c55e' },
            { label: 'Bushels', checked: showHexagons, toggle: () => setShowHexagons(v => !v), color: '#a855f7' },
          ].map(layer => (
            <button
              key={layer.label}
              onClick={layer.toggle}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium shadow-md transition-all',
                layer.checked
                  ? 'bg-card/95 backdrop-blur border border-border text-foreground'
                  : 'bg-card/60 backdrop-blur border border-transparent text-muted-foreground opacity-70'
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: layer.checked ? layer.color : (isDark ? '#4A5440' : '#cbd5e1'),
                  boxShadow: layer.checked ? `0 0 6px ${layer.color}40` : 'none',
                }}
              />
              {layer.label}
            </button>
          ))}
        </div>

        {/* Legend — bottom-right */}
        <div className="absolute bottom-4 right-4 z-[1000] rounded-lg bg-card/90 backdrop-blur border border-border px-3 py-2.5 shadow-lg">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Legend</span>
          <div className="mt-1.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: '#22c55e', boxShadow: '0 0 4px rgba(34,197,94,0.4)' }} />
              <span className="text-[10px] text-muted-foreground">Own elevators</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: '#ef4444', boxShadow: '0 0 4px rgba(239,68,68,0.4)' }} />
              <span className="text-[10px] text-muted-foreground">Competitor elevators</span>
            </div>
            <div className="mt-1.5">
              <span className="text-[10px] text-muted-foreground">Competitive pressure</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[9px] text-green-400">Safe</span>
                <div
                  className="flex-1 h-2.5 rounded-full"
                  style={{ background: 'linear-gradient(to right, rgb(74,222,128), rgb(245,158,11), rgb(239,68,68))' }}
                />
                <span className="text-[9px] text-red-400">At risk</span>
              </div>
            </div>
          </div>
          {selectedElevatorId && competitiveStats.ownWins + competitiveStats.compWins > 0 && (
            <div className="mt-2 pt-2 border-t border-border space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-green-400">Winning</span>
                <span className="text-foreground font-medium">{competitiveStats.ownWins} <span className="text-muted-foreground font-normal">({competitiveStats.ownAcres.toLocaleString()} ac)</span></span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-red-400">Losing</span>
                <span className="text-foreground font-medium">{competitiveStats.compWins} <span className="text-muted-foreground font-normal">({competitiveStats.compAcres.toLocaleString()} ac)</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Farmer detail panel (click on map dot) */}
        {selectedFarmer && !focusedFarmer && (
          <FarmerDetailPanel
            farmer={selectedFarmer}
            elevators={elevators}
            onClose={handleFarmerDetailClose}
            onDrillDown={handleFarmerDrillDown}
            onSendToQueue={handleFarmerDetailSend}
            theme={theme}
          />
        )}

        {/* Producer Panel — toggleable right overlay */}
        <div className={cn(
          'absolute top-0 right-0 bottom-0 z-[1001] w-80 bg-card border-l border-border flex flex-col shadow-xl transition-transform duration-300 ease-in-out',
          selectedElevatorId && showProducerPanel ? 'translate-x-0' : 'translate-x-full'
        )}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Producer Panel</span>
              <button
                onClick={() => setShowProducerPanel(false)}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <TerritoryFarmerList
              elevator={selectedElevator}
              farmers={territoryFarmers}
              totalAcres={territoryAcres}
              selectedFarmerId={selectedFarmer?.id ?? null}
              onFarmerSelect={handleFarmerClick}
              selectedFarmerIds={selectedFarmerIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onClearSelection={handleClearSelection}
              onSendToQueue={handleSendToQueue}
              sendStatus={sendStatus}
            />
          </div>

        {/* Competitor Panel — right overlay with competitor detail */}
        <div className={cn(
          'absolute top-0 bottom-0 z-[1001] w-80 bg-card border-l border-border flex flex-col shadow-xl transition-transform duration-300 ease-in-out',
          showCompetitorPanel ? 'translate-x-0' : 'translate-x-full',
          showProducerPanel ? 'right-80' : 'right-0'
        )}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <span className="text-xs font-semibold text-foreground">
                {selectedCompetitor ? selectedCompetitor.name : 'Competitor Panel'}
              </span>
              <button
                onClick={() => { setShowCompetitorPanel(false); setSelectedCompetitor(null) }}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedCompetitor ? (() => {
              const comp = selectedCompetitor
              const bids = competitorBids[comp.id]
              const history = competitorBidHistory[comp.id] ?? []
              const cropKey = selectedCrop ?? 'CORN'
              const cropLabel = CROP_LABELS[cropKey] ?? cropKey

              return (
                <div className="flex-1 overflow-y-auto">
                  {/* Metadata */}
                  <div className="p-3 border-b border-border space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm bg-red-500 shrink-0" />
                      <span className="text-[11px] font-medium text-foreground">{comp.operator}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                      <span className="text-muted-foreground">Location</span>
                      <span className="text-foreground">{comp.lat.toFixed(3)}°N, {Math.abs(comp.lng).toFixed(3)}°W</span>
                      <span className="text-muted-foreground">Facility</span>
                      <span className="text-foreground">{comp.name}</span>
                    </div>
                  </div>

                  {/* Current bids */}
                  <div className="p-3 border-b border-border space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current Posted Bids</span>
                    <div className="space-y-1">
                      {(['CORN', 'SOYBEANS', 'WHEAT'] as const).map(crop => {
                        const bid = bids?.[crop]
                        return (
                          <div key={crop} className={cn(
                            'flex items-center justify-between px-2 py-1 rounded text-[11px]',
                            crop === cropKey ? 'bg-secondary' : ''
                          )}>
                            <span className="text-muted-foreground">{CROP_LABELS[crop] ?? crop}</span>
                            <span className={cn(
                              'font-mono font-medium',
                              crop === cropKey ? 'text-red-400' : 'text-foreground'
                            )}>
                              {bid != null ? `-${(bid / 100).toFixed(2)}` : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Trend chart — You vs Them */}
                  {(() => {
                    const ownHistory = selectedElevatorId ? ownElevatorBidHistory[selectedElevatorId] ?? [] : []
                    const selectedElev = elevators.find(e => e.id === selectedElevatorId)
                    const ownLabel = selectedElev?.code ?? 'You'

                    const theirData = history.map(h => h[cropKey as keyof typeof h] as number)
                    const ownData = ownHistory.map(h => h[cropKey as keyof typeof h] as number)
                    const chartDates = history.map(h => h.date)

                    // Current spread
                    const currentOwn = ownData.length > 0 ? ownData[ownData.length - 1] : null
                    const currentTheirs = theirData.length > 0 ? theirData[theirData.length - 1] : null
                    const spread = currentOwn != null && currentTheirs != null ? currentOwn - currentTheirs : null

                    return (
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {cropLabel} Basis — 12mo
                          </span>
                          {spread != null && (
                            <span className={cn(
                              'text-[10px] font-mono font-medium',
                              spread > 0 ? 'text-red-400' : spread < 0 ? 'text-green-400' : 'text-muted-foreground'
                            )}>
                              spread {spread > 0 ? '+' : ''}{spread}¢
                            </span>
                          )}
                        </div>
                        {chartDates.length > 0 ? (
                          <BidTrendChart
                            dates={chartDates}
                            series={[
                              ...(ownData.length > 0 ? [{ label: ownLabel, color: '#4ade80', data: ownData }] : []),
                              { label: comp.operator, color: '#3b82f6', data: theirData },
                            ]}
                          />
                        ) : (
                          <p className="text-[10px] text-muted-foreground">No history available</p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })() : (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-xs text-muted-foreground text-center">Click a competitor on the map to view details</p>
              </div>
            )}
          </div>
      </div>
    </div>
  )
}

// ── Bid Setup panel (floating over map) ──

const BidSetupPanel = memo(function BidSetupPanel({ position, elevator, posted, leeway, freight, onPostedChange, onLeewayChange, onFreightChange, onClose }: {
  position: PositionSummary
  elevator: Elevator | null | undefined
  posted: number      // cents — the posted bid basis
  leeway: number      // cents — spread around posted (min = posted - leeway, max = posted + leeway)
  freight: number     // cents per mile — cost of freight
  onPostedChange: (v: number) => void
  onLeewayChange: (v: number) => void
  onFreightChange: (v: number) => void
  onClose: () => void
}) {
  const minBid = (posted - leeway) / 100
  const postedDisplay = posted / 100
  const maxBid = (posted + leeway) / 100

  const bidRow = (label: string, value: number, color: string, onUp: () => void, onDown: () => void, extraClass?: string) => (
    <div className={cn('flex items-center justify-between', extraClass)}>
      <span className={cn('text-[10px] font-medium', `text-${color}-400`)}>{label}</span>
      <div className="flex items-center gap-1">
        <div className={cn('flex items-center border rounded-md overflow-hidden', `border-${color}-400/30`)}>
          <input
            type="text"
            readOnly
            value={`${value < 0 ? '' : '-'}${Math.abs(value).toFixed(2)}`}
            onKeyDown={e => {
              if (e.key === 'ArrowUp') { e.preventDefault(); onUp() }
              else if (e.key === 'ArrowDown') { e.preventDefault(); onDown() }
            }}
            className={cn('w-16 text-sm font-mono font-semibold text-center py-1 px-1 outline-none cursor-default bg-transparent transition-colors', `text-${color}-400 focus:bg-${color}-400/15 focus:ring-1 focus:ring-${color}-400/40`)}
          />
          <div className={cn('flex flex-col border-l', `border-${color}-400/30`)}>
            <button onClick={onUp} className={cn('px-1 py-0 transition-colors', `hover:bg-${color}-400/10 text-${color}-400/60 hover:text-${color}-400`)}><ChevronUp className="h-3 w-3" /></button>
            <button onClick={onDown} className={cn('px-1 py-0 transition-colors border-t', `hover:bg-${color}-400/10 text-${color}-400/60 hover:text-${color}-400 border-${color}-400/30`)}><ChevronDown className="h-3 w-3" /></button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="w-56 rounded-lg bg-card/95 backdrop-blur border border-border shadow-xl flex flex-col overflow-hidden" data-testid="bid-setup-panel">
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-foreground">{elevator?.name ?? 'Unknown'}</p>
            <p className="text-[10px] text-muted-foreground">
              {CROP_LABELS[position.crop]} · {MONTH_SHORT[position.delivery_month] ?? position.delivery_month} '{String(position.crop_year).slice(-2)}
            </p>
          </div>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {bidRow('Min', -minBid, 'green',
          () => onLeewayChange(Math.max(1, leeway - 1)),
          () => onLeewayChange(Math.min(30, leeway + 1)),
        )}
        {bidRow('Posted', -postedDisplay, 'amber',
          () => onPostedChange(Math.max(1, posted - 1)),
          () => onPostedChange(Math.min(60, posted + 1)),
        )}
        {bidRow('Max', -maxBid, 'red',
          () => onLeewayChange(Math.max(1, leeway - 1)),
          () => onLeewayChange(Math.min(30, leeway + 1)),
        )}

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Leeway</span>
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <input
              type="text"
              readOnly
              value={`±${leeway}¢`}
              className="w-16 text-xs font-mono font-medium text-center py-1 px-1 outline-none bg-transparent text-foreground"
            />
            <div className="flex flex-col border-l border-border">
              <button onClick={() => onLeewayChange(Math.min(30, leeway + 1))} className="px-1 py-0 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><ChevronUp className="h-3 w-3" /></button>
              <button onClick={() => onLeewayChange(Math.max(1, leeway - 1))} className="px-1 py-0 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border-t border-border"><ChevronDown className="h-3 w-3" /></button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Freight</span>
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <input
              type="text"
              readOnly
              value={`${freight.toFixed(1)}¢/mi`}
              className="w-16 text-xs font-mono font-medium text-center py-1 px-1 outline-none bg-transparent text-foreground"
            />
            <div className="flex flex-col border-l border-border">
              <button onClick={() => onFreightChange(Math.min(2.0, +(freight + 0.1).toFixed(1)))} className="px-1 py-0 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><ChevronUp className="h-3 w-3" /></button>
              <button onClick={() => onFreightChange(Math.max(0.1, +(freight - 0.1).toFixed(1)))} className="px-1 py-0 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border-t border-border"><ChevronDown className="h-3 w-3" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// ── Territory farmer list (right panel) ──

const TerritoryFarmerList = memo(function TerritoryFarmerList({ elevator, farmers, totalAcres, selectedFarmerId, onFarmerSelect, selectedFarmerIds, onToggleSelect, onSelectAll, onClearSelection, onSendToQueue, sendStatus }: {
  elevator: Elevator | null | undefined
  farmers: (Farmer & { distance: number | null; estimatedBasis: number; tierIndex: number })[]
  totalAcres: number
  selectedFarmerId: string | null
  onFarmerSelect: (farmer: Farmer) => void
  selectedFarmerIds: Set<string>
  onToggleSelect: (farmerId: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onSendToQueue: (farmerIds: string[]) => void
  sendStatus: 'idle' | 'sending' | 'sent' | 'error'
}) {
  const BU_PER_ACRE = 180
  const selectedBushels = farmers
    .filter(f => selectedFarmerIds.has(f.id))
    .reduce((sum, f) => sum + (f.total_acres ?? 0) * BU_PER_ACRE, 0)
  const selectedCount = selectedFarmerIds.size

  return (
    <div className="flex flex-col flex-1 min-h-0" data-testid="territory-farmer-list">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-green-400" />
          <h3 className="text-sm font-bold text-foreground">
            {elevator?.name ?? 'Territory'} Farmers
          </h3>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span><span className="text-foreground font-medium">{farmers.length}</span> farmers</span>
          <span><span className="text-foreground font-medium">{totalAcres.toLocaleString()}</span> acres</span>
        </div>

        {/* Selection controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={selectedCount === farmers.length ? onClearSelection : onSelectAll}
              className="text-xs text-green-400 hover:text-green-300 font-medium"
            >
              {selectedCount === farmers.length ? 'Clear all' : 'Select all'}
            </button>
          </div>
          {selectedCount > 0 && (
            <span className="text-xs text-foreground">
              <span className="font-semibold text-green-400">{selectedCount}</span> selected
              <span className="text-muted-foreground ml-1.5">·</span>
              <span className="font-mono ml-1.5">{(selectedBushels / 1000).toFixed(0)}k bu</span>
            </span>
          )}
        </div>
        {selectedCount > 0 && (
          <button
            onClick={() => onSendToQueue([...selectedFarmerIds])}
            disabled={sendStatus === 'sending'}
            className={cn(
              'w-full rounded-md text-white text-xs font-semibold py-2 transition-colors',
              sendStatus === 'sent' ? 'bg-green-700' :
              sendStatus === 'error' ? 'bg-red-600' :
              sendStatus === 'sending' ? 'bg-green-800 opacity-60' :
              'bg-green-600 hover:bg-green-500'
            )}
          >
            {sendStatus === 'sending' ? 'Sending...' :
             sendStatus === 'sent' ? `✓ Sent ${selectedCount} to Queue` :
             sendStatus === 'error' ? 'Failed — Try Again' :
             `Send ${selectedCount} to Originator Queue`}
          </button>
        )}
      </div>

      {/* Farmer list — filtered + grouped by originator in accordions */}
      <TerritoryFarmerAccordion
        farmers={farmers}
        selectedFarmerId={selectedFarmerId}
        onFarmerSelect={onFarmerSelect}
        selectedFarmerIds={selectedFarmerIds}
        onToggleSelect={onToggleSelect}
      />
    </div>
  )
})

// ── Accordion farmer list with filters ──

type ContactRecencyFilter = 'all' | 'lt3d' | 'lt7d' | 'lt30d' | 'never'
type ContactTypeFilter = 'all' | 'SPOT_SALE' | 'INBOUND_CALL' | 'OUTBOUND_CALL' | 'SITE_VISIT'

const NOW_SIM = new Date('2025-10-15').getTime()

function getDaysAgo(dateStr: string): number {
  return Math.floor((NOW_SIM - new Date(dateStr).getTime()) / 86400000)
}

function contactInfo(lc: FarmerContact | null | undefined): { label: string; color: string; daysAgo: number | null } {
  if (!lc) return { label: '', color: 'text-muted-foreground/40', daysAgo: null }
  const daysAgo = getDaysAgo(lc.created_at)
  const typeLabels: Record<string, string> = {
    SPOT_SALE: '🟢 spot', INBOUND_CALL: '📞 inbound', OUTBOUND_CALL: '📞 outbound',
    SITE_VISIT: '🏠 visit', EMAIL: '✉️ email',
  }
  const tl = typeLabels[lc.contact_type] ?? lc.contact_type
  let label = `${tl} ${daysAgo}d ago`
  if (lc.contact_type === 'SPOT_SALE' && lc.bushels_sold) {
    label = `${tl} ${(lc.bushels_sold / 1000).toFixed(0)}k bu · ${daysAgo}d`
  }
  const color = daysAgo <= 3 ? 'text-amber-400' : (lc.contact_type === 'SPOT_SALE' && daysAgo <= 14) ? 'text-green-400' : 'text-muted-foreground/60'
  return { label, color, daysAgo }
}

function TerritoryFarmerAccordion({ farmers, selectedFarmerId, onFarmerSelect, selectedFarmerIds, onToggleSelect }: {
  farmers: (Farmer & { distance: number | null; estimatedBasis: number; tierIndex: number })[]
  selectedFarmerId: string | null
  onFarmerSelect: (farmer: Farmer) => void
  selectedFarmerIds: Set<string>
  onToggleSelect: (farmerId: string) => void
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [recencyFilter, setRecencyFilter] = useState<ContactRecencyFilter>('all')
  const [typeFilter, setTypeFilter] = useState<ContactTypeFilter>('all')
  const [minAcres, setMinAcres] = useState(0)

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Apply filters
  const filteredFarmers = useMemo(() => {
    return farmers.filter(f => {
      // Acres filter
      if (minAcres > 0 && (f.total_acres ?? 0) < minAcres) return false

      const ci = contactInfo(f.last_contact)

      // Recency filter
      if (recencyFilter === 'never' && f.last_contact) return false
      if (recencyFilter === 'lt3d' && (ci.daysAgo === null || ci.daysAgo > 3)) return false
      if (recencyFilter === 'lt7d' && (ci.daysAgo === null || ci.daysAgo > 7)) return false
      if (recencyFilter === 'lt30d' && (ci.daysAgo === null || ci.daysAgo > 30)) return false

      // Contact type filter
      if (typeFilter !== 'all' && f.last_contact?.contact_type !== typeFilter) return false

      return true
    })
  }, [farmers, recencyFilter, typeFilter, minAcres])

  // Group filtered farmers by originator
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; farmers: typeof filteredFarmers }>()
    const unassigned: typeof filteredFarmers = []
    for (const f of filteredFarmers) {
      if (!f.originator_id) { unassigned.push(f); continue }
      const existing = map.get(f.originator_id)
      if (existing) existing.farmers.push(f)
      else map.set(f.originator_id, { name: f.originator_name ?? 'Unknown', farmers: [f] })
    }
    const sorted = [...map.entries()].sort((a, b) => b[1].farmers.length - a[1].farmers.length)
    if (unassigned.length) sorted.push(['unassigned', { name: 'Unassigned', farmers: unassigned }])
    return sorted
  }, [filteredFarmers])

  // Stats for each group (computed from unfiltered farmers for context)
  const groupStats = useMemo(() => {
    const stats = new Map<string, { total: number; totalAcres: number; contactedLt7d: number; spotSales: number }>()
    for (const f of farmers) {
      const key = f.originator_id ?? 'unassigned'
      const s = stats.get(key) ?? { total: 0, totalAcres: 0, contactedLt7d: 0, spotSales: 0 }
      s.total++
      s.totalAcres += f.total_acres ?? 0
      if (f.last_contact) {
        const d = getDaysAgo(f.last_contact.created_at)
        if (d <= 7) s.contactedLt7d++
        if (f.last_contact.contact_type === 'SPOT_SALE') s.spotSales++
      }
      stats.set(key, s)
    }
    return stats
  }, [farmers])

  const hasFilters = recencyFilter !== 'all' || typeFilter !== 'all' || minAcres > 0
  const filterBtnClass = (active: boolean) => cn(
    'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
    active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-transparent'
  )

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      {/* Filters */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filters
          </span>
          {hasFilters && (
            <button
              onClick={() => { setRecencyFilter('all'); setTypeFilter('all'); setMinAcres(0) }}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Last contact recency */}
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Last contact</span>
          <div className="flex flex-wrap gap-1">
            <button className={filterBtnClass(recencyFilter === 'all')} onClick={() => setRecencyFilter('all')}>All</button>
            <button className={filterBtnClass(recencyFilter === 'lt3d')} onClick={() => setRecencyFilter('lt3d')}>&lt; 3d</button>
            <button className={filterBtnClass(recencyFilter === 'lt7d')} onClick={() => setRecencyFilter('lt7d')}>&lt; 7d</button>
            <button className={filterBtnClass(recencyFilter === 'lt30d')} onClick={() => setRecencyFilter('lt30d')}>&lt; 30d</button>
            <button className={filterBtnClass(recencyFilter === 'never')} onClick={() => setRecencyFilter('never')}>Never</button>
          </div>
        </div>

        {/* Contact type */}
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Type</span>
          <div className="flex flex-wrap gap-1">
            <button className={filterBtnClass(typeFilter === 'all')} onClick={() => setTypeFilter('all')}>All</button>
            <button className={filterBtnClass(typeFilter === 'SPOT_SALE')} onClick={() => setTypeFilter('SPOT_SALE')}>Spot sale</button>
            <button className={filterBtnClass(typeFilter === 'OUTBOUND_CALL')} onClick={() => setTypeFilter('OUTBOUND_CALL')}>Outbound</button>
            <button className={filterBtnClass(typeFilter === 'INBOUND_CALL')} onClick={() => setTypeFilter('INBOUND_CALL')}>Inbound</button>
            <button className={filterBtnClass(typeFilter === 'SITE_VISIT')} onClick={() => setTypeFilter('SITE_VISIT')}>Visit</button>
          </div>
        </div>

        {/* Min acres */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Min acres</span>
          <input
            type="number"
            value={minAcres || ''}
            placeholder="0"
            onChange={e => setMinAcres(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-16 bg-transparent border border-border rounded px-2 py-0.5 text-xs text-foreground outline-none focus:border-green-400/50"
          />
        </div>

        {hasFilters && (
          <div className="text-[10px] text-muted-foreground">
            Showing <span className="text-foreground font-medium">{filteredFarmers.length}</span> of {farmers.length} farmers
          </div>
        )}
      </div>

      {/* Originator accordion groups */}
      <div className="flex-1 overflow-auto">
        {groups.map(([origId, group]) => {
          const isExpanded = expandedGroups.has(origId)
          const stats = groupStats.get(origId)
          const groupSelected = group.farmers.filter(f => selectedFarmerIds.has(f.id)).length

          return (
            <div key={origId} className="border-b border-border">
              {/* Accordion header */}
              <button
                onClick={() => toggleGroup(origId)}
                className="w-full px-4 py-3 flex items-center gap-2 hover:bg-secondary/30 transition-colors"
              >
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">{group.name}</span>
                    <span className="text-xs text-muted-foreground">({group.farmers.length})</span>
                    {groupSelected > 0 && (
                      <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 rounded-full font-medium">{groupSelected} sel</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{(stats?.totalAcres ?? 0).toLocaleString()} ac</span>
                    {(stats?.contactedLt7d ?? 0) > 0 && (
                      <span className="text-amber-400">{stats!.contactedLt7d} contacted &lt;7d</span>
                    )}
                    {(stats?.spotSales ?? 0) > 0 && (
                      <span className="text-green-400">{stats!.spotSales} spot sales</span>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded farmer rows */}
              {isExpanded && group.farmers.map(farmer => {
                const isChecked = selectedFarmerIds.has(farmer.id)
                const globalIdx = filteredFarmers.indexOf(farmer)
                const t = filteredFarmers.length > 1 ? Math.max(0, globalIdx) / (filteredFarmers.length - 1) : 0
                const basisColor = t < 0.5
                  ? `color-mix(in oklch, #4ade80 ${(1 - t * 2) * 100}%, #fbbf24)`
                  : `color-mix(in oklch, #fbbf24 ${(1 - (t - 0.5) * 2) * 100}%, #f87171)`

                const ci = contactInfo(farmer.last_contact)

                return (
                  <div
                    key={farmer.id}
                    className={cn(
                      'w-full text-left pl-10 pr-4 py-3 border-t border-border/30 transition-colors flex items-start gap-3',
                      farmer.id === selectedFarmerId ? 'bg-green-500/10' :
                      isChecked ? 'bg-green-500/5' : 'hover:bg-secondary/50'
                    )}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSelect(farmer.id) }}
                      className={cn(
                        'mt-0.5 h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
                        isChecked ? 'bg-green-500 border-green-500' : 'border-muted-foreground/40 hover:border-green-400'
                      )}
                    >
                      {isChecked && (
                        <svg className="h-3 w-3 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <button onClick={() => onFarmerSelect(farmer)} className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{farmer.name}</span>
                        <span className="text-sm font-mono font-semibold" style={{ color: basisColor }}>
                          {farmer.estimatedBasis.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {farmer.preferred_crop && <span>{CROP_LABELS[farmer.preferred_crop]}</span>}
                        {farmer.total_acres && <span>{farmer.total_acres.toLocaleString()} ac</span>}
                        {farmer.distance != null && <span className="text-muted-foreground/60">{farmer.distance.toFixed(1)} mi</span>}
                      </div>
                      {ci.label && (
                        <div className={cn('mt-1 text-xs', ci.color)}>{ci.label}</div>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
        {filteredFarmers.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {hasFilters ? 'No farmers match filters' : 'No farmers in this territory'}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Farmer detail panel with proximity mini-map ──

const FarmerDetailPanel = memo(function FarmerDetailPanel({ farmer, elevators, onClose, onDrillDown, onSendToQueue, theme = 'dark' }: {
  farmer: Farmer
  elevators: Elevator[]
  onClose: () => void
  onDrillDown: () => void
  onSendToQueue?: () => void
  theme?: 'light' | 'dark'
}) {
  const proximity = useMemo(
    () => computeProximity(farmer, elevators, competitorElevators),
    [farmer, elevators]
  )

  // Road distance state — populated by ProximityMap callback
  const [roadData, setRoadData] = useState<{
    ownMiles: number; ownMinutes: number
    compMiles: number; compMinutes: number
    advantage: number
  } | null>(null)

  // Reset road data when farmer changes
  useEffect(() => { setRoadData(null) }, [farmer.id])

  const handleRoutesLoaded = useCallback((data: import('./ProximityMap').ProximityRouteData) => {
    setRoadData({
      ownMiles: data.ownDistanceMiles,
      ownMinutes: data.ownDurationMinutes,
      compMiles: data.compDistanceMiles,
      compMinutes: data.compDurationMinutes,
      advantage: data.advantage,
    })
  }, [])

  // Use road distances when available, haversine as fallback
  const ownDist = roadData?.ownMiles ?? proximity?.distanceOwn
  const compDist = roadData?.compMiles ?? proximity?.distanceCompetitor
  const advantage = roadData?.advantage ?? proximity?.advantage

  return (
    <div className="absolute top-4 right-14 w-80 bg-card border border-border rounded-lg shadow-2xl z-[1000] overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">{farmer.name}</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Proximity mini-map — click to drill down onto main canvas */}
      {proximity && (
        <div className="border-b border-border">
          <button
            onClick={onDrillDown}
            className="w-full relative group cursor-pointer h-40"
            title="Click to expand on map"
          >
            <ProximityMap
              farmer={farmer}
              nearestOwn={proximity.nearestOwn}
              nearestCompetitor={proximity.nearestCompetitor}
              distanceOwn={proximity.distanceOwn}
              distanceCompetitor={proximity.distanceCompetitor}
              theme={theme}
              onRoutesLoaded={handleRoutesLoaded}
            />
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-foreground bg-card/80 backdrop-blur rounded px-2 py-1">
                Expand on map
              </span>
            </div>
          </button>
          <div className="px-3 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-sm bg-green-500" />
              {roadData ? (
                <>
                  <span className="text-green-400 font-medium">{roadData.ownMiles.toFixed(1)} mi</span>
                  <span className="text-muted-foreground/60">· {Math.round(roadData.ownMinutes)} min</span>
                  <span className="text-muted-foreground">to {proximity.nearestOwn.name}</span>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 border border-muted-foreground/30 border-t-green-400 rounded-full animate-spin" />
                  <span className="text-muted-foreground/50">calculating…</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-sm bg-blue-500" />
              {roadData ? (
                <>
                  <span className="text-blue-400 font-medium">{roadData.compMiles.toFixed(1)} mi</span>
                  <span className="text-muted-foreground/60">· {Math.round(roadData.compMinutes)} min</span>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 border border-muted-foreground/30 border-t-blue-400 rounded-full animate-spin" />
                  <span className="text-muted-foreground/50">calculating…</span>
                </>
              )}
            </div>
          </div>
          {roadData ? (
            <div className="px-3 pb-2">
              {roadData.advantage > 0 ? (
                <div className="rounded bg-green-500/10 border border-green-500/20 px-2 py-1 text-xs text-green-400 font-medium">
                  +{roadData.advantage.toFixed(1)} mi freight advantage · {Math.round(roadData.ownMinutes)} min drive
                </div>
              ) : (
                <div className="rounded bg-red-500/10 border border-red-500/20 px-2 py-1 text-xs text-red-400 font-medium">
                  {roadData.advantage.toFixed(1)} mi freight disadvantage
                </div>
              )}
            </div>
          ) : (
            <div className="px-3 pb-2">
              <div className="rounded bg-muted/50 border border-border px-2 py-1 text-xs text-muted-foreground flex items-center gap-1.5">
                <div className="h-3 w-3 border border-muted-foreground/30 border-t-foreground/50 rounded-full animate-spin" />
                Calculating freight advantage…
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-3 space-y-3">
        {farmer.phone && (
          <div className="flex items-center gap-2 text-xs">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-foreground">{farmer.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-foreground">{farmer.region}</span>
        </div>
        {farmer.preferred_crop && (
          <div className="flex items-center gap-2 text-xs">
            <Wheat className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-foreground">{CROP_LABELS[farmer.preferred_crop]}</span>
            {farmer.total_acres && (
              <span className="text-muted-foreground">· {farmer.total_acres.toLocaleString()} acres</span>
            )}
          </div>
        )}
        {farmer.notes && (
          <div className="flex items-start gap-2 text-xs">
            <StickyNote className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <span className="text-muted-foreground leading-relaxed">{farmer.notes}</span>
          </div>
        )}

        <button
          onClick={onSendToQueue}
          className="w-full mt-2 rounded-md bg-green-600 hover:bg-green-500 text-white text-xs font-semibold py-2 transition-colors"
        >
          Send to Originator Queue
        </button>
      </div>
    </div>
  )
})
