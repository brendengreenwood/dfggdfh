import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Layers, Filter, X, Wheat, Phone, MapPin, StickyNote, Users, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { LandscapeMap } from './LandscapeMap'
import { ProximityMap, computeProximity } from './ProximityMap'
import type { FarmerContact } from '@/types/kernel'
import { competitorElevators } from '@/data/competitors'
import { assignToSites, computeVoronoi, type VoronoiSite } from '@/lib/voronoi'
import { haversineMiles } from '@/lib/geo'
import type { CropType, Elevator, Farmer, PositionSummary } from '@/types/kernel'

const CROP_LABELS: Record<CropType, string> = {
  CORN: 'Corn',
  SOYBEANS: 'Soybeans',
  WHEAT: 'Wheat',
  SORGHUM: 'Sorghum',
  OATS: 'Oats',
}

export function StrategyView() {
  const [searchParams] = useSearchParams()
  const { currentUser } = useCurrentUser()
  // If launched from position table, these are locked in via URL params
  const launchedElevatorId = searchParams.get('elevator')
  const launchedCrop = searchParams.get('crop') as CropType | null
  const selectedMonth = searchParams.get('month')
  const selectedYear = searchParams.get('year') ? Number(searchParams.get('year')) : null
  const isLaunched = !!launchedElevatorId // true = came from position table, elevator is locked

  // Standalone mode: user picks elevator from dropdown
  const [standaloneElevatorId, setStandaloneElevatorId] = useState<string | null>(null)
  const [standaloneCrop, setStandaloneCrop] = useState<CropType | null>(null)

  const selectedElevatorId = launchedElevatorId ?? standaloneElevatorId
  const selectedCrop = launchedCrop ?? standaloneCrop

  const [elevators, setElevators] = useState<Elevator[]>([])
  const [allFarmers, setAllFarmers] = useState<Farmer[]>([])
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null)
  const [showCompetitors, setShowCompetitors] = useState(true)
  const [showFarmers, setShowFarmers] = useState(true)
  const [showVoronoi, setShowVoronoi] = useState(true)
  const [basisPrice, setBasisPrice] = useState(15)  // cents — anchor at natural cell boundary (e.g. -0.15)
  const [innerLeeway, setInnerLeeway] = useState(5)  // cents — how far inward toward elevator (tighter pricing)
  const [outerLeeway, setOuterLeeway] = useState(10) // cents — how far outward past boundary (aggressive reach)
  const [selectedFarmerIds, setSelectedFarmerIds] = useState<Set<string>>(new Set())
  const [focusedFarmer, setFocusedFarmer] = useState<Farmer | null>(null) // drill-down into farmer proximity on main map

  const [currentPosition, setCurrentPosition] = useState<PositionSummary | null>(null)
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

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

  // Fetch position for selected elevator + month + crop
  useEffect(() => {
    if (!currentUser?.id || !selectedElevatorId || !selectedMonth) {
      setCurrentPosition(null)
      return
    }
    fetch(`/api/positions?userId=${currentUser.id}`)
      .then(r => r.json())
      .then((positions: PositionSummary[]) => {
        const match = positions.find(p =>
          p.elevator_id === selectedElevatorId &&
          p.delivery_month === selectedMonth &&
          (!selectedCrop || p.crop === selectedCrop) &&
          (!selectedYear || p.crop_year === selectedYear)
        )
        setCurrentPosition(match ?? null)
      })
      .catch(() => setCurrentPosition(null))
  }, [currentUser?.id, selectedElevatorId, selectedMonth, selectedCrop, selectedYear])

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

  // Freight cost model: cents per mile (approximation — real data comes from data scientist's service)
  // Lower rate means outerLeeway reaches further per cent spent
  const FREIGHT_CENTS_PER_MILE = 0.4

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

  // Derived bid values from the three controls
  const minBid = basisPrice - innerLeeway  // tightest bid (at elevator)
  const maxBid = basisPrice + outerLeeway  // widest bid (at/beyond cell edge)
  const totalSpread = innerLeeway + outerLeeway
  // Tier count: one tier per ~3 cents of spread (reasonable visual density)
  const tierCount = Math.max(1, Math.round(totalSpread / 3))

  // Farmer basis: interpolated from position in territory
  // At elevator (distance=0): -(basisPrice - innerLeeway) = tightest (least paid to farmer)
  // At cell boundary: -basisPrice
  // Beyond boundary (reachable via outerLeeway): -(basisPrice + outerLeeway) = widest (most paid to farmer)
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

  // Build color map from distance rank (stable across bid changes — sort order never changes)
  const farmerColors = useMemo(() => {
    const map = new Map<string, string>()
    // Sort by distance descending (farthest first = widest bid = green at top of list)
    const sorted = [...cellFarmers].sort((a, b) => (b.distance ?? 0) - (a.distance ?? 0))
    const len = sorted.length
    if (len === 0) return map
    const green = [74, 222, 128]
    const amber = [251, 191, 36]
    const red   = [248, 113, 113]
    sorted.forEach((f, idx) => {
      const t = len > 1 ? idx / (len - 1) : 0
      let r: number, g: number, b: number
      if (t < 0.5) {
        const s = t * 2
        r = green[0] + (amber[0] - green[0]) * s
        g = green[1] + (amber[1] - green[1]) * s
        b = green[2] + (amber[2] - green[2]) * s
      } else {
        const s = (t - 0.5) * 2
        r = amber[0] + (red[0] - amber[0]) * s
        g = amber[1] + (red[1] - amber[1]) * s
        b = amber[2] + (red[2] - amber[2]) * s
      }
      map.set(f.id, `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`)
    })
    return map
  }, [cellFarmers])

  const territoryAcres = useMemo(
    () => territoryFarmers.reduce((sum, f) => sum + (f.total_acres ?? 0), 0),
    [territoryFarmers]
  )

  // Compute proximity data for the drilled-in farmer (drives LandscapeMap proximity view)
  const focusedProximity = useMemo(() => {
    if (!focusedFarmer) return null
    const prox = computeProximity(focusedFarmer, elevators, competitorElevators)
    if (!prox) return null
    return { farmer: focusedFarmer, ...prox }
  }, [focusedFarmer, elevators])

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-0" data-testid="strategy-view">
      {/* Sidebar */}
      <aside className={cn(
        'border-r border-border bg-card p-4 space-y-4 overflow-auto flex-shrink-0',
        isLaunched ? 'w-48' : 'w-64'
      )}>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Market Landscape
          </h2>
          {currentUser && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentUser.name} · {currentUser.region}
            </p>
          )}
        </div>

        {isLaunched ? (
          /* ── Launched from position: locked context ── */
          <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400">Position Context</span>
            <p className="text-sm font-medium text-foreground">{selectedElevator?.name}</p>
            {selectedCrop && <p className="text-xs text-muted-foreground">{CROP_LABELS[selectedCrop] ?? selectedCrop}</p>}
            {selectedMonth && <p className="text-xs text-muted-foreground">{selectedMonth} {selectedYear ?? ''}</p>}
          </div>
        ) : (
          /* ── Standalone: elevator select + layer toggles ── */
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Layers className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Elevator</span>
              </div>
              <select
                value={standaloneElevatorId ?? ''}
                onChange={e => setStandaloneElevatorId(e.target.value || null)}
                className="w-full rounded-md border border-border bg-secondary px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-green-500"
              >
                <option value="">Select elevator…</option>
                {elevators.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>

              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <Wheat className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Crop</span>
              </div>
              <select
                value={standaloneCrop ?? ''}
                onChange={e => setStandaloneCrop((e.target.value || null) as CropType | null)}
                className="w-full rounded-md border border-border bg-secondary px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-green-500"
              >
                <option value="">All crops</option>
                {Object.entries(CROP_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {/* Layer toggles */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Layers</span>
              </div>
              {[
                { label: 'Voronoi cells', checked: showVoronoi, toggle: () => setShowVoronoi(v => !v) },
                { label: 'Farmer locations', checked: showFarmers, toggle: () => setShowFarmers(v => !v) },
                { label: 'Competitors', checked: showCompetitors, toggle: () => setShowCompetitors(v => !v) },
              ].map(layer => (
                <label key={layer.label} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layer.checked}
                    onChange={layer.toggle}
                    className="h-3.5 w-3.5 rounded-sm border border-input bg-secondary accent-green-500"
                  />
                  <span className="text-sm text-muted-foreground">{layer.label}</span>
                </label>
              ))}
            </div>
          </>
        )}

        {/* Layer toggles — always visible in launched mode too, just compact */}
        {isLaunched && (
          <div className="space-y-1.5">
            {[
              { label: 'Cells', checked: showVoronoi, toggle: () => setShowVoronoi(v => !v) },
              { label: 'Farmers', checked: showFarmers, toggle: () => setShowFarmers(v => !v) },
              { label: 'Competitors', checked: showCompetitors, toggle: () => setShowCompetitors(v => !v) },
            ].map(layer => (
              <label key={layer.label} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layer.checked}
                  onChange={layer.toggle}
                  className="h-3 w-3 rounded-sm border border-input bg-secondary accent-green-500"
                />
                <span className="text-xs text-muted-foreground">{layer.label}</span>
              </label>
            ))}
          </div>
        )}
      </aside>

      {/* Map */}
      <div className="flex-1 relative">
        <LandscapeMap
          elevators={elevators}
          farmers={showFarmers ? visibleFarmers : []}
          selectedElevatorId={selectedElevatorId}
          onFarmerClick={setSelectedFarmer}
          minBid={minBid}
          maxBid={maxBid}
          tierCount={tierCount}
          selectedCellPolygon={selectedCellPolygon}
          expandedCellPolygon={expandedCellPolygon}
          farmerColors={farmerColors}
          focusedProximity={focusedProximity}
          reachableFarmerIds={new Set(cellFarmers.filter(f => !f.inNaturalCell).map(f => f.id))}
        />

        {/* Back button when drilled into proximity view */}
        {focusedFarmer && (
          <button
            onClick={() => setFocusedFarmer(null)}
            className="absolute top-4 left-4 z-[1000] flex items-center gap-2 rounded-lg bg-card/90 backdrop-blur border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors shadow-lg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to territory
          </button>
        )}

        {/* Freight advantage badge when drilled in */}
        {focusedFarmer && focusedProximity && (
          <div className="absolute bottom-4 left-4 z-[1000]">
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

        {/* Farmer detail panel (click on map dot) */}
        {selectedFarmer && !focusedFarmer && (
          <FarmerDetailPanel
            farmer={selectedFarmer}
            elevators={elevators}
            onClose={() => setSelectedFarmer(null)}
            onDrillDown={() => setFocusedFarmer(selectedFarmer)}
            onSendToQueue={() => sendToQueue([selectedFarmer.id])}
          />
        )}
      </div>

      {/* Territory farmer list (right panel) */}
      {selectedElevatorId && (
        <TerritoryFarmerList
          elevator={selectedElevator}
          farmers={territoryFarmers}
          totalAcres={territoryAcres}
          selectedFarmerId={selectedFarmer?.id ?? null}
          onFarmerSelect={(farmer) => setSelectedFarmer(farmer)}
          basisPrice={basisPrice}
          innerLeeway={innerLeeway}
          outerLeeway={outerLeeway}
          onBasisPriceChange={setBasisPrice}
          onInnerLeewayChange={setInnerLeeway}
          onOuterLeewayChange={setOuterLeeway}
          selectedFarmerIds={selectedFarmerIds}
          onToggleSelect={(id) => setSelectedFarmerIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
          })}
          onSelectAll={() => setSelectedFarmerIds(new Set(territoryFarmers.map(f => f.id)))}
          onClearSelection={() => setSelectedFarmerIds(new Set())}
          position={currentPosition}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onSendToQueue={(ids) => sendToQueue(ids)}
          sendStatus={sendStatus}
        />
      )}
    </div>
  )
}

// ── Territory farmer list (right panel) ──

function TerritoryFarmerList({ elevator, farmers, totalAcres, selectedFarmerId, onFarmerSelect, basisPrice, innerLeeway, outerLeeway, onBasisPriceChange, onInnerLeewayChange, onOuterLeewayChange, selectedFarmerIds, onToggleSelect, onSelectAll, onClearSelection, position, selectedMonth, selectedYear, onSendToQueue, sendStatus }: {
  elevator: Elevator | null | undefined
  farmers: (Farmer & { distance: number | null; estimatedBasis: number; tierIndex: number })[]
  totalAcres: number
  selectedFarmerId: string | null
  onFarmerSelect: (farmer: Farmer) => void
  basisPrice: number
  innerLeeway: number
  outerLeeway: number
  onBasisPriceChange: (v: number) => void
  onInnerLeewayChange: (v: number) => void
  onOuterLeewayChange: (v: number) => void
  selectedFarmerIds: Set<string>
  onToggleSelect: (farmerId: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  position: PositionSummary | null
  selectedMonth: string | null
  selectedYear: number | null
  onSendToQueue: (farmerIds: string[]) => void
  sendStatus: 'idle' | 'sending' | 'sent' | 'error'
}) {
  // Estimated bushels for selected farmers (rough: acres × 180 bu/ac corn avg)
  const BU_PER_ACRE = 180
  const selectedBushels = farmers
    .filter(f => selectedFarmerIds.has(f.id))
    .reduce((sum, f) => sum + (f.total_acres ?? 0) * BU_PER_ACRE, 0)
  const selectedCount = selectedFarmerIds.size

  // Position impact from selections
  const coverageGap = position?.coverage_gap ?? 0
  const coverageTarget = position?.coverage_target ?? 0
  const currentPhysical = position?.bushels_physical ?? 0
  const projectedPhysical = currentPhysical + selectedBushels
  const newGap = Math.max(0, coverageTarget - projectedPhysical)
  const gapReduction = coverageGap - newGap
  const currentCoveragePct = coverageTarget > 0 ? (currentPhysical / coverageTarget) * 100 : 0
  const projectedCoveragePct = coverageTarget > 0 ? (projectedPhysical / coverageTarget) * 100 : 0

  return (
    <aside className="w-80 border-l border-border bg-card flex flex-col flex-shrink-0" data-testid="territory-farmer-list">
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

        {/* Bid controls: min → basis → max (displayed as actual bid prices) */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bid Controls
          </span>

          {(() => {
            const minBidDisplay = (basisPrice - innerLeeway) / 100
            const basisDisplay = basisPrice / 100
            const maxBidDisplay = (basisPrice + outerLeeway) / 100

            const bidRow = (label: string, value: number, color: string, borderColor: string, onUp: () => void, onDown: () => void, extraClass?: string) => (
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
                      className={cn('w-14 text-sm font-mono font-semibold text-center py-1 px-1 outline-none cursor-default bg-transparent transition-colors', `text-${color}-400 focus:bg-${color}-400/15 focus:ring-1 focus:ring-${color}-400/40`)}
                    />
                    <div className={cn('flex flex-col border-l', `border-${color}-400/30`)}>
                      <button onClick={onUp} className={cn('px-1 py-0 transition-colors', `hover:bg-${color}-400/10 text-${color}-400/60 hover:text-${color}-400`)}><ChevronUp className="h-3 w-3" /></button>
                      <button onClick={onDown} className={cn('px-1 py-0 transition-colors border-t', `hover:bg-${color}-400/10 text-${color}-400/60 hover:text-${color}-400 border-${color}-400/30`)}><ChevronDown className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
              </div>
            )

            return <>
              {bidRow('Min', -minBidDisplay, 'green',  'green',
                () => onInnerLeewayChange(Math.max(1, innerLeeway - 1)),  // up = tighter = less leeway
                () => onInnerLeewayChange(Math.min(30, innerLeeway + 1)), // down = wider = more leeway
              )}
              {bidRow('Basis', -basisDisplay, 'amber', 'amber',
                () => onBasisPriceChange(Math.max(5, basisPrice - 1)),    // up = tighter basis
                () => onBasisPriceChange(Math.min(40, basisPrice + 1)),   // down = wider basis
                'border-y border-border/50 py-1.5',
              )}
              {bidRow('Max', -maxBidDisplay, 'red', 'red',
                () => onOuterLeewayChange(Math.max(1, outerLeeway - 1)),  // up = less aggressive
                () => onOuterLeewayChange(Math.min(30, outerLeeway + 1)), // down = more aggressive
              )}
            </>
          })()}
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
    </aside>
  )
}

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

function FarmerDetailPanel({ farmer, elevators, onClose, onDrillDown, onSendToQueue }: {
  farmer: Farmer
  elevators: Elevator[]
  onClose: () => void
  onDrillDown: () => void
  onSendToQueue?: () => void
}) {
  const proximity = useMemo(
    () => computeProximity(farmer, elevators, competitorElevators),
    [farmer, elevators]
  )

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
            className="w-full relative group cursor-pointer"
            title="Click to expand on map"
          >
            <ProximityMap
              farmer={farmer}
              nearestOwn={proximity.nearestOwn}
              nearestCompetitor={proximity.nearestCompetitor}
              distanceOwn={proximity.distanceOwn}
              distanceCompetitor={proximity.distanceCompetitor}
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
              <span className="text-green-400 font-medium">{proximity.distanceOwn.toFixed(1)} mi</span>
              <span className="text-muted-foreground">to {proximity.nearestOwn.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-sm bg-red-500" />
              <span className="text-red-400 font-medium">{proximity.distanceCompetitor.toFixed(1)} mi</span>
              <span className="text-muted-foreground">to competitor</span>
            </div>
          </div>
          {proximity.advantage > 0 && (
            <div className="px-3 pb-2">
              <div className="rounded bg-green-500/10 border border-green-500/20 px-2 py-1 text-xs text-green-400 font-medium">
                +{proximity.advantage.toFixed(1)} mi freight advantage
              </div>
            </div>
          )}
          {proximity.advantage <= 0 && (
            <div className="px-3 pb-2">
              <div className="rounded bg-red-500/10 border border-red-500/20 px-2 py-1 text-xs text-red-400 font-medium">
                {proximity.advantage.toFixed(1)} mi freight disadvantage
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
}
