import { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Filter, X, Wheat, Phone, MapPin, StickyNote, Users, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTheme } from '@/hooks/useTheme'
import { LandscapeMap } from './LandscapeMap'
import { ProximityMap, computeProximity } from './ProximityMap'
import { BidTrendChart } from './BidTrendChart'
import type { FarmerContact } from '@/types/kernel'
import { competitorElevators, competitorBids, competitorBidHistory, ownElevatorBidHistory, DATES as BID_DATES, type CompetitorElevator } from '@/data/competitors'
import { type VoronoiSite } from '@/lib/voronoi'
import { computeTerritoryGrid } from '@/lib/territory-grid'
import { haversineMiles } from '@/lib/geo'
import type { CropType, DeliveryMonth, Elevator, Farmer, PositionSummary } from '@/types/kernel'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

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


// ── Bid History Table (search + filter + scrollable daily records) ──
type MergedBidRow = { date: string; comp: import('@/data/competitors').DailyBidRecord; own?: import('@/data/competitors').DailyBidRecord }
type HistoryCrop = 'CORN' | 'SOYBEANS' | 'WHEAT'

function BidHistoryTable({ merged, allCrops, cropKey, cropLabels, isDark }: {
  merged: MergedBidRow[]
  allCrops: readonly HistoryCrop[]
  cropKey: string
  cropLabels: Record<string, string>
  isDark: boolean
}) {
  const [histSearch, setHistSearch] = useState('')
  const [histCrop, setHistCrop] = useState<HistoryCrop | 'ALL'>('ALL')
  const [histRange, setHistRange] = useState<'30' | '90' | '365'>('90')

  const activeCrop = histCrop === 'ALL' ? (cropKey as HistoryCrop) : histCrop

  const filtered = useMemo(() => {
    let rows = merged
    // Date range filter
    const days = parseInt(histRange)
    if (days < 365) rows = rows.slice(0, days)
    // Date search
    if (histSearch.trim()) {
      const q = histSearch.trim().toLowerCase()
      rows = rows.filter(r => r.date.includes(q))
    }
    return rows
  }, [merged, histRange, histSearch])

  return (
    <div className="border-t border-border">
      {/* Header */}
      <div className="px-3 pt-3 pb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Bid History
        </span>
      </div>

      {/* Controls row */}
      <div className="px-3 pb-2 space-y-1.5">
        {/* Search */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-secondary/30">
          <Search className="h-3 w-3 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={histSearch}
            onChange={e => setHistSearch(e.target.value)}
            placeholder="Search date..."
            className="bg-transparent outline-none text-[10px] text-foreground w-full placeholder:text-muted-foreground/50"
          />
          {histSearch && (
            <button onClick={() => setHistSearch('')} className="text-muted-foreground hover:text-foreground">
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-1.5">
          {/* Crop filter */}
          {allCrops.map(crop => (
            <button
              key={crop}
              onClick={() => setHistCrop(prev => prev === crop ? 'ALL' : crop)}
              className={cn(
                'px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors',
                histCrop === crop
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'bg-secondary/50 text-muted-foreground border-transparent hover:border-border'
              )}
            >
              {(cropLabels[crop] ?? crop).substring(0, 4)}
            </button>
          ))}
          <div className="flex-1" />
          {/* Range filter */}
          {(['30', '90', '365'] as const).map(r => (
            <button
              key={r}
              onClick={() => setHistRange(r)}
              className={cn(
                'px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors',
                histRange === r
                  ? 'bg-secondary text-foreground border-border'
                  : 'text-muted-foreground border-transparent hover:border-border'
              )}
            >
              {r === '365' ? '1y' : r + 'd'}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-4 px-3 py-1 border-y border-border text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
        <span>Date</span>
        <span className="text-right">You</span>
        <span className="text-right">Them</span>
        <span className="text-right">Spread</span>
      </div>

      {/* Scrollable rows */}
      <div className="max-h-[240px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-center text-[10px] text-muted-foreground">No records match</div>
        ) : (
          filtered.map((row, i) => {
            const compVal = row.comp[activeCrop]
            const ownVal = row.own?.[activeCrop]
            const spread = ownVal != null ? ownVal - compVal : null
            // Day-over-day delta for competitor
            const prevRow = filtered[i + 1] // reversed order, so i+1 is previous day
            const prevComp = prevRow?.comp[activeCrop]
            const delta = prevComp != null ? compVal - prevComp : 0

            const dateObj = new Date(row.date + 'T00:00:00')
            const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

            return (
              <div
                key={row.date}
                className={cn(
                  'grid grid-cols-4 px-3 py-1 text-[10px] font-mono border-b border-border/50 hover:bg-secondary/30 transition-colors',
                  i % 2 === 0 ? '' : 'bg-secondary/10'
                )}
              >
                <span className="text-muted-foreground">{dateLabel}</span>
                <span className="text-right text-foreground">
                  {ownVal != null ? '-' + (ownVal / 100).toFixed(2) : '—'}
                </span>
                <span className="text-right text-blue-400 flex items-center justify-end gap-0.5">
                  <span>-{(compVal / 100).toFixed(2)}</span>
                  {delta !== 0 && (
                    <span className={cn('text-[8px]', delta > 0 ? 'text-red-400' : 'text-green-600')}>
                      {delta > 0 ? '▲' : '▼'}
                    </span>
                  )}
                </span>
                <span className={cn(
                  'text-right font-medium',
                  spread == null ? 'text-muted-foreground'
                    : spread > 0 ? 'text-red-400'
                    : spread < 0 ? 'text-green-600'
                    : 'text-muted-foreground'
                )}>
                  {spread != null ? (spread > 0 ? '+' : '') + spread + '¢' : '—'}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border text-[9px] text-muted-foreground">
        {filtered.length} of {merged.length} records · {cropLabels[activeCrop] ?? activeCrop}
      </div>
    </div>
  )
}


export function StrategyView() {
  const [searchParams] = useSearchParams()
  const { currentUser, allUsers } = useCurrentUser()
  const { theme, isDark } = useTheme()
  const originators = useMemo(() => allUsers.filter(u => u.persona === 'ORIGINATOR'), [allUsers])
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

  // Date navigation — view historical bids for a specific date
  // Default to last date in our bid data (simulated "today")
  const [viewDate, setViewDate] = useState(BID_DATES[BID_DATES.length - 1])
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const viewDateIndex = BID_DATES.indexOf(viewDate)
  const canGoBack = viewDateIndex > 0
  const canGoForward = viewDateIndex < BID_DATES.length - 1

  const [allPositions, setAllPositions] = useState<PositionSummary[]>([])
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  // Per-contract bid settings — persisted when switching between contracts
  type TransportMode = 'estimated' | 'real' | 'time'
  type ContractBidState = {
    posted: number      // cents — posted bid basis at elevator
    maxBid: number      // cents — maximum bid to win distant farmers
    increment: number   // cents — step size for bid adjustments
    leeway: number      // cents — spread between posted and max
    transportCost: number // cost value — interpreted by transportMode
    transportMode: TransportMode // 'estimated' = ¢/mi haversine, 'real' = ¢/mi OSRM, 'time' = ¢/min
  }
  const [contractBids, setContractBids] = useState<Record<string, ContractBidState>>({})

  // Get or initialize bid state for the active contract
  const getContractBid = (posId: string, basis: number | null): ContractBidState => {
    if (contractBids[posId]) return contractBids[posId]
    const p = Math.round(Math.abs(basis ?? 0.15) * 100)
    return { posted: p, maxBid: p + 10, increment: 1, leeway: 10, transportCost: 5.2, transportMode: 'estimated' }
  }
  const updateContractBid = useCallback((posId: string, update: Partial<ContractBidState>) => {
    setContractBids(prev => {
      const existing = prev[posId] ?? { posted: 15, maxBid: 25, increment: 1, leeway: 10, transportCost: 5.2, transportMode: 'estimated' as TransportMode }
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
    : { posted: 15, maxBid: 25, increment: 1, leeway: 10, transportCost: 5.2, transportMode: 'estimated' as const }
  const basisPrice = activeBid.posted
  const outerLeeway = activeBid.leeway
  // Convert transport cost to cents/mile equivalent for map computations
  // 'estimated' and 'real' are already ¢/mi; 'time' we approximate as ¢/min → ¢/mi (avg 45mph → 1 mi ≈ 1.33 min)
  const freightCost = activeBid.transportMode === 'time'
    ? activeBid.transportCost * 1.33
    : activeBid.transportCost

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
  const visibleFarmers = useMemo(() =>
    selectedCrop
      ? allFarmers.filter(f => f.preferred_crop === selectedCrop)
      : allFarmers
  , [allFarmers, selectedCrop])

  // Build voronoi sites — used by LandscapeMap for background grid lines
  const voronoiSites = useMemo((): VoronoiSite[] => [
    ...elevators
      .filter(e => e.lat != null && e.lng != null)
      .map(e => ({ id: e.id, lat: e.lat!, lng: e.lng!, isOwn: true })),
    ...competitorElevators.map(c => ({ id: c.id, lat: c.lat, lng: c.lng, isOwn: false })),
  ], [elevators])

  // Freight cost model: cents per mile (per-contract, adjustable by merchant)
  const FREIGHT_CENTS_PER_MILE = freightCost

  // ── Competitive analysis: who wins each farmer? ──
  const cropKey = (selectedCrop ?? 'CORN') as keyof typeof competitorBids[string]

  // Date-aware competitor bid lookup — resolves bid for each competitor on viewDate
  const viewDateCompetitorBids = useMemo(() => {
    const bids: Record<string, { CORN: number; SOYBEANS: number; WHEAT: number }> = {}
    for (const comp of competitorElevators) {
      const history = competitorBidHistory[comp.id]
      if (!history) {
        const sb = competitorBids[comp.id]
        if (sb) bids[comp.id] = { CORN: sb.CORN, SOYBEANS: sb.SOYBEANS, WHEAT: sb.WHEAT }
        continue
      }
      const rec = history.find(h => h.date === viewDate)
      if (rec) {
        bids[comp.id] = { CORN: rec.CORN, SOYBEANS: rec.SOYBEANS, WHEAT: rec.WHEAT }
      } else {
        const sb = competitorBids[comp.id]
        if (sb) bids[comp.id] = { CORN: sb.CORN, SOYBEANS: sb.SOYBEANS, WHEAT: sb.WHEAT }
      }
    }
    return bids
  }, [viewDate])

  // ── Grid-based territory boundaries ──
  // Sample a grid across the map area, compute net-price winner at each point.
  // Inner contour (green solid) = territory at posted bid
  // Outer contour (amber dashed) = territory at posted + leeway
  const gridBounds = useMemo(() => {
    const allLats = [
      ...elevators.filter(e => e.lat).map(e => e.lat!),
      ...competitorElevators.map(c => c.lat),
    ]
    const allLngs = [
      ...elevators.filter(e => e.lng).map(e => e.lng!),
      ...competitorElevators.map(c => c.lng),
    ]
    if (allLats.length === 0) return { minLat: 40.5, maxLat: 43.0, minLng: -96.5, maxLng: -92.0 }
    const pad = 0.5
    return {
      minLat: Math.min(...allLats) - pad,
      maxLat: Math.max(...allLats) + pad,
      minLng: Math.min(...allLngs) - pad,
      maxLng: Math.max(...allLngs) + pad,
    }
  }, [elevators])

  const competitorPoints = useMemo(() =>
    competitorElevators.map(c => ({
      id: c.id,
      lat: c.lat,
      lng: c.lng,
      bid: viewDateCompetitorBids[c.id]?.[cropKey] ?? 15,
    })),
    [viewDateCompetitorBids, cropKey],
  )

  // Inner boundary: territory at current posted bid
  const postedContours = useMemo(() => {
    const selElev = elevators.find(e => e.id === selectedElevatorId)
    if (!selElev?.lat || !selElev?.lng || competitorPoints.length === 0) return []
    const user = { id: selElev.id, lat: selElev.lat, lng: selElev.lng, bid: basisPrice }
    const result = computeTerritoryGrid(user, competitorPoints, FREIGHT_CENTS_PER_MILE, gridBounds, 50)
    return result.contours
  }, [selectedElevatorId, elevators, competitorPoints, basisPrice, FREIGHT_CENTS_PER_MILE, gridBounds])

  // Outer boundary: territory at posted + leeway (max reach)
  const leewayContours = useMemo(() => {
    if (outerLeeway <= 0) return []
    const selElev = elevators.find(e => e.id === selectedElevatorId)
    if (!selElev?.lat || !selElev?.lng || competitorPoints.length === 0) return []
    const user = { id: selElev.id, lat: selElev.lat, lng: selElev.lng, bid: basisPrice + outerLeeway }
    const result = computeTerritoryGrid(user, competitorPoints, FREIGHT_CENTS_PER_MILE, gridBounds, 50)
    return result.contours
  }, [selectedElevatorId, elevators, competitorPoints, basisPrice, outerLeeway, FREIGHT_CENTS_PER_MILE, gridBounds])

  // ── Competitive win analysis (single O(n×m) pass) ──
  const farmerWins = useMemo(() => {
    const wins = new Map<string, { winner: 'own' | 'competitor'; margin: number; competitorName?: string; netBid: number; distToUser: number; targetLat: number; targetLng: number }>()
    if (!selectedElevatorId) return wins

    const selElev = elevators.find(e => e.id === selectedElevatorId)
    if (!selElev?.lat || !selElev?.lng) return wins

    const userPosted = basisPrice

    visibleFarmers.forEach(f => {
      if (f.lat == null || f.lng == null) return

      const distToUser = haversineMiles(f.lat, f.lng, selElev.lat!, selElev.lng!)
      const userNetPrice = userPosted - (distToUser * FREIGHT_CENTS_PER_MILE)

      let bestCompNet = -Infinity
      let bestCompName = ''
      let bestCompLat = 0
      let bestCompLng = 0
      for (const comp of competitorElevators) {
        const compBids = viewDateCompetitorBids[comp.id]
        if (!compBids) continue
        const compPosted = compBids[cropKey] ?? 15
        const distToComp = haversineMiles(f.lat, f.lng, comp.lat, comp.lng)
        const compNetPrice = compPosted - (distToComp * FREIGHT_CENTS_PER_MILE)
        if (compNetPrice > bestCompNet) {
          bestCompNet = compNetPrice
          bestCompName = comp.name + ' (' + comp.operator + ')'
          bestCompLat = comp.lat
          bestCompLng = comp.lng
        }
      }

      const margin = userNetPrice - bestCompNet
      const isOwn = margin >= 0
      wins.set(f.id, {
        winner: isOwn ? 'own' : 'competitor',
        margin,
        competitorName: isOwn ? undefined : bestCompName,
        netBid: userNetPrice,
        distToUser,
        targetLat: isOwn ? selElev.lat! : bestCompLat,
        targetLng: isOwn ? selElev.lng! : bestCompLng,
      })
    })

    return wins
  }, [selectedElevatorId, elevators, visibleFarmers, basisPrice, FREIGHT_CENTS_PER_MILE, cropKey, viewDateCompetitorBids])

  // ── Territory farmers: farmers the user could win at posted + leeway ──
  // Reads from farmerWins instead of recalculating — zero extra haversine calls
  const cellFarmers = useMemo(() => {
    if (!selectedElevatorId) return []
    return visibleFarmers
      .filter(f => {
        const w = farmerWins.get(f.id)
        if (!w) return false
        // Farmer is reachable if margin + leeway >= 0
        return w.margin + outerLeeway >= 0
      })
      .map(f => {
        const w = farmerWins.get(f.id)!
        return {
          ...f,
          distance: w.distToUser,
          inNaturalCell: w.margin >= 0,
        }
      })
  }, [selectedElevatorId, visibleFarmers, farmerWins, outerLeeway])

  // Derived bid values
  const minBid = basisPrice
  const maxBid = activeBid.maxBid
  const totalSpread = maxBid - minBid
  const tierCount = Math.max(1, Math.round(totalSpread / 3))
  const territoryFarmers = useMemo(() => {
    const maxDist = cellFarmers.reduce((m, f) => Math.max(m, f.distance ?? 0), 0) || 1

    return cellFarmers
      .map(f => {
        const depth = f.distance != null ? f.distance / maxDist : 1
        const bidCents = minBid + (maxBid - minBid) * depth
        const estimatedBasis = -(bidCents / 100)
        const tierIndex = Math.min(tierCount - 1, Math.floor(depth * tierCount))
        return { ...f, estimatedBasis, tierIndex }
      })
      .sort((a, b) => a.estimatedBasis - b.estimatedBasis)
  }, [cellFarmers, minBid, maxBid, tierCount])

  // Auto-populate producer panel with winning farmers when territory changes
  useEffect(() => {
    const newIds = new Set(territoryFarmers.map(f => f.id))
    setSelectedFarmerIds(prev => {
      // Only update if IDs actually changed (prevents render loop)
      if (prev.size === newIds.size && [...newIds].every(id => prev.has(id))) return prev
      return newIds
    })
  }, [territoryFarmers])

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
  const handleBidUpdate = useCallback((update: Partial<ContractBidState>) => {
    if (currentPosition) updateContractBid(currentPosition.id, update)
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
          postedContours={postedContours}
          leewayContours={leewayContours}
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
          competitorBidsForDate={viewDateCompetitorBids}
          freightCost={freightCost}
          theme={theme}
        />

        {/* Floating Contracts Panel — left side over map */}
        <div className="absolute top-4 left-4 z-[1000] w-52 max-h-[calc(100%-2rem)] rounded-lg bg-card/95 backdrop-blur border border-border flex flex-col shadow-xl overflow-hidden animate-enter-left" style={{ animationDelay: '0.15s' }} data-testid="positions-sidebar">
          {/* Controls: date, elevator, crop — single compact section */}
          <div className="px-2 py-2 border-b border-border flex flex-col gap-1.5">
            {/* Date navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => canGoBack && setViewDate(BID_DATES[viewDateIndex - 1])}
                disabled={!canGoBack}
              >
                <ChevronLeft />
              </Button>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger
                  className={cn(
                    'flex-1 h-7 rounded-md border border-input bg-transparent px-2 text-[11px] font-medium text-foreground tabular-nums text-center outline-none',
                    'hover:bg-muted focus:border-ring focus:ring-1 focus:ring-ring/50 transition-colors cursor-pointer'
                  )}
                >
                  {new Date(viewDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </PopoverTrigger>
                <PopoverContent align="center" className="w-auto p-0 shadow-2xl">
                  <Calendar
                    mode="single"
                    selected={new Date(viewDate + 'T12:00:00')}
                    onSelect={(date) => {
                      if (!date) return
                      const iso = date.toLocaleDateString('en-CA') // YYYY-MM-DD
                      const idx = BID_DATES.indexOf(iso)
                      if (idx >= 0) {
                        setViewDate(iso)
                        setDatePickerOpen(false)
                      }
                    }}
                    disabled={(date) => {
                      const iso = date.toLocaleDateString('en-CA')
                      return !BID_DATES.includes(iso)
                    }}
                    defaultMonth={new Date(viewDate + 'T12:00:00')}
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => canGoForward && setViewDate(BID_DATES[viewDateIndex + 1])}
                disabled={!canGoForward}
              >
                <ChevronRight />
              </Button>
            </div>
            {/* Elevator selector */}
            <select
              value={selectedElevatorId ?? ''}
              onChange={e => {
                const val = e.target.value || null
                setSelectedElevatorId(val)
                setActivePositionId(null)
                setCropFilter(null)
              }}
              className="w-full text-[11px] h-7 rounded-md border border-input bg-transparent px-2 text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
              style={{ colorScheme: isDark ? 'dark' : 'light' }}
            >
              <option value="">Select elevator…</option>
              {userElevators.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            {/* Crop filter */}
            {selectedElevatorId && availableCrops.length > 0 && (
              availableCrops.length > 3 ? (
                <select
                  value={cropFilter ?? ''}
                  onChange={e => setCropFilter((e.target.value || null) as CropType | null)}
                  className="w-full text-[11px] h-7 rounded-md border border-input bg-transparent px-2 text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
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
                        'flex-1 h-7 rounded-md text-[10px] font-medium transition-colors text-center',
                        cropFilter === crop
                          ? 'bg-secondary text-foreground border border-border'
                          : 'border border-input bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {CROP_LABELS[crop]}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>

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
                        ? 'bg-green-600/10 border border-green-600/20'
                        : 'border border-transparent hover:bg-secondary/60 hover:border-border'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'shrink-0 size-3 rounded-full border-2 transition-colors',
                        isActive
                          ? 'border-green-600 bg-green-600'
                          : 'border-muted-foreground/40 bg-transparent'
                      )} />
                      <span className="text-[11px] font-semibold text-foreground shrink-0">
                        {MONTH_SHORT[pos.delivery_month] ?? pos.delivery_month} '{String(pos.crop_year).slice(-2)}
                      </span>
                      <span className="flex-1" />
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
            'absolute left-56 z-[1000] flex flex-col gap-2 transition-all duration-200 ease-out animate-enter-left',
            selectedElevatorId && currentPosition && !focusedFarmer
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none'
          )}
          style={{ top: bidPanelTop, animationDelay: '0.25s' }}
        >
            {currentPosition && (
              <BidSetupPanel
                position={currentPosition}
                elevator={selectedElevator}
                bid={activeBid}
                onUpdate={handleBidUpdate}
                onClose={handleBidPanelClose}
              />
            )}

          </div>

        {/* Farmer price lookup — top center */}
        <div ref={searchRef} className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-72 animate-enter-top" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center rounded-lg bg-card/95 backdrop-blur border border-border shadow-lg px-3 py-2 gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Look up farmer price…"
              value={farmerSearch}
              onChange={e => setFarmerSearch(e.target.value)}
              onFocus={() => setFarmerSearchFocused(true)}
              onBlur={(e) => {
                if (!searchRef.current?.contains(e.relatedTarget as Node)) {
                  setTimeout(() => setFarmerSearchFocused(false), 150)
                }
              }}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {farmerSearch && (
              <button onClick={() => { setFarmerSearch(''); setFarmerSearchFocused(false) }} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
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
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 animate-enter-right" style={{ animationDelay: '0.2s' }}>
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
                ? 'bg-green-600/10 border border-green-600/20 text-green-600'
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
              <div className="rounded-lg bg-green-600/10 backdrop-blur border border-green-600/15 px-4 py-2.5 text-sm text-green-600 font-semibold shadow-lg">
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex gap-1 flex-wrap justify-center animate-enter-bottom" style={{ animationDelay: '0.3s' }}>
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
        <div className="absolute bottom-4 right-4 z-[1000] rounded-lg bg-card/90 backdrop-blur border border-border px-3 py-2.5 shadow-lg animate-enter-right" style={{ animationDelay: '0.35s' }}>
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
                <span className="text-[9px] text-green-600">Safe</span>
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
                <span className="text-green-600">Winning</span>
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
            positions={filteredPositions}
            contractBids={contractBids}
            getContractBid={getContractBid}
            freightCentsPerMile={FREIGHT_CENTS_PER_MILE}
            selectedElevatorId={selectedElevatorId}
            originators={originators}
          />
        )}

        {/* Producer Panel — toggleable right overlay */}
        <div className={cn(
          'absolute top-0 right-0 bottom-0 z-[1001] w-80 bg-card border-l border-border flex flex-col shadow-xl transition-all duration-300 ease-in-out',
          showProducerPanel ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
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
            {selectedElevatorId ? (
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
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-xs text-muted-foreground text-center">Select an elevator to see producers</p>
              </div>
            )}
          </div>

        {/* Competitor Panel — right overlay, stacks left of producer panel */}
        <div className={cn(
          'absolute top-0 bottom-0 z-[1002] w-80 bg-card border-l border-border flex flex-col shadow-xl transition-all duration-300 ease-in-out',
          showCompetitorPanel ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none',
        )} style={{ right: showCompetitorPanel && showProducerPanel ? '320px' : '0px' }}>
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

            {/* Sliding two-panel view: list ← → detail */}
            {(() => {
              const selectedElev = elevators.find(e => e.id === selectedElevatorId)
              const sortedCompetitors = selectedElev
                ? [...competitorElevators]
                    .map(c => ({
                      ...c,
                      distance: haversineMiles(selectedElev.lat, selectedElev.lng, c.lat, c.lng),
                      bid: viewDateCompetitorBids[c.id]?.[selectedCrop ?? 'CORN'],
                    }))
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, 50)
                : []

              const comp = selectedCompetitor
              const bids = comp ? viewDateCompetitorBids[comp.id] : undefined
              const history = comp ? (competitorBidHistory[comp.id] ?? []) : []
              const cropKey = selectedCrop ?? 'CORN'
              const cropLabel = CROP_LABELS[cropKey] ?? cropKey

              return (
                <div className="flex-1 overflow-hidden relative">
                  {/* Track with two panels side by side */}
                  <div
                    className="flex h-full transition-transform duration-300 ease-in-out"
                    style={{ transform: selectedCompetitor ? 'translateX(-100%)' : 'translateX(0)' }}
                  >
                    {/* Panel 1: Proximity list */}
                    <div className="w-full shrink-0 overflow-y-auto">
                      <div className="px-3 py-2 border-b border-border">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {sortedCompetitors.length} Competitors by Proximity
                        </span>
                      </div>
                      {sortedCompetitors.length > 0 ? (
                        <div className="divide-y divide-border">
                          {sortedCompetitors.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setSelectedCompetitor(c)}
                              className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors group"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-2 h-2 rounded-sm bg-blue-500 shrink-0" />
                                  <span className="text-[11px] font-medium text-foreground truncate">{c.name}</span>
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                                  {c.distance.toFixed(1)} mi
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-0.5 pl-4">
                                <span className="text-[10px] text-muted-foreground truncate">{c.operator}</span>
                                {c.bid != null && (
                                  <span className="text-[10px] font-mono text-blue-400 shrink-0 ml-2">
                                    -{(c.bid / 100).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center p-6">
                          <p className="text-xs text-muted-foreground text-center">Select an elevator to see nearby competitors</p>
                        </div>
                      )}
                    </div>

                    {/* Panel 2: Competitor detail */}
                    <div className="w-full shrink-0 overflow-y-auto">
                      {/* Back to list */}
                      <button
                        onClick={() => setSelectedCompetitor(null)}
                        className="w-full flex items-center gap-1 px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border-b border-border"
                      >
                        <ChevronDown className="h-3 w-3 rotate-90" />
                        Back to list
                      </button>

                      {comp && (
                        <>
                          {/* Metadata */}
                          <div className="p-3 border-b border-border space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm bg-blue-500 shrink-0" />
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
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Posted Bids</span>
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
                                      crop === cropKey ? 'text-blue-400' : 'text-foreground'
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
                            const selElev = elevators.find(e => e.id === selectedElevatorId)
                            const ownLabel = selElev?.code ?? 'You'

                            const theirData = history.map(h => h[cropKey as keyof typeof h] as number)
                            const ownData = ownHistory.map(h => h[cropKey as keyof typeof h] as number)
                            const chartDates = history.map(h => h.date)

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
                                      spread > 0 ? 'text-red-400' : spread < 0 ? 'text-green-600' : 'text-muted-foreground'
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

                          {/* Bid History — daily records with search & filters */}
                          {comp && (() => {
                            const ownHist = selectedElevatorId ? ownElevatorBidHistory[selectedElevatorId] ?? [] : []
                            const compHist = competitorBidHistory[comp.id] ?? []
                            const allCrops = ['CORN', 'SOYBEANS', 'WHEAT'] as const

                            // Build merged daily records (newest first)
                            const merged = compHist.map((rec, i) => {
                              const ownRec = ownHist[i]
                              return { date: rec.date, comp: rec, own: ownRec }
                            }).reverse()

                            return (
                              <BidHistoryTable
                                merged={merged}
                                allCrops={allCrops}
                                cropKey={cropKey}
                                cropLabels={CROP_LABELS}
                                isDark={isDark}
                              />
                            )
                          })()}

                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
      </div>
    </div>
  )
}

// ── Bid Setup panel (floating over map) ──

const TRANSPORT_LABELS: Record<string, string> = { estimated: 'Est. distance', real: 'Real distance', time: 'Travel time' }
const TRANSPORT_UNITS: Record<string, string> = { estimated: '¢/mi', real: '¢/mi', time: '¢/min' }

const BidSetupPanel = memo(function BidSetupPanel({ position, elevator, bid, onUpdate, onClose }: {
  position: PositionSummary
  elevator: Elevator | null | undefined
  bid: { posted: number; maxBid: number; increment: number; leeway: number; transportCost: number; transportMode: string }
  onUpdate: (update: Record<string, unknown>) => void
  onClose: () => void
}) {
  const { posted, maxBid, increment, leeway, transportCost, transportMode } = bid

  const stepField = (label: string, value: number, format: (v: number) => string, onUp: () => void, onDown: () => void) => (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center border border-border rounded-md overflow-hidden">
        <input
          type="text"
          readOnly
          value={format(value)}
          onKeyDown={e => {
            if (e.key === 'ArrowUp') { e.preventDefault(); onUp() }
            else if (e.key === 'ArrowDown') { e.preventDefault(); onDown() }
          }}
          className="w-16 text-xs font-mono font-semibold text-center py-1 px-1 outline-none cursor-default bg-transparent text-foreground focus:bg-secondary/50 focus:ring-1 focus:ring-border"
        />
        <div className="flex flex-col border-l border-border">
          <button onClick={onUp} className="px-1 py-0 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><ChevronUp className="h-3 w-3" /></button>
          <button onClick={onDown} className="px-1 py-0 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border-t border-border"><ChevronDown className="h-3 w-3" /></button>
        </div>
      </div>
    </div>
  )

  const fmtBasis = (v: number) => `-${(v / 100).toFixed(2)}`
  const fmtTransport = (v: number) => `${v.toFixed(1)}`

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

        {stepField('Posted bid', posted, fmtBasis,
          () => onUpdate({ posted: Math.max(1, posted - increment) }),
          () => onUpdate({ posted: Math.min(99, posted + increment) }),
        )}
        {stepField('Max bid', maxBid, fmtBasis,
          () => onUpdate({ maxBid: Math.max(posted + 1, maxBid - increment) }),
          () => onUpdate({ maxBid: Math.min(99, maxBid + increment) }),
        )}
        {stepField('Increment', increment, fmtBasis,
          () => onUpdate({ increment: Math.min(10, increment + 1) }),
          () => onUpdate({ increment: Math.max(1, increment - 1) }),
        )}
        {stepField('Leeway', leeway, (v) => `±${(v / 100).toFixed(2)}`,
          () => onUpdate({ leeway: Math.min(50, leeway + 1) }),
          () => onUpdate({ leeway: Math.max(0, leeway - 1) }),
        )}

        {/* Transport cost with mode selector */}
        <div className="pt-1 border-t border-border/50 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">Transport cost</span>
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <input
                type="text"
                readOnly
                value={fmtTransport(transportCost)}
                onKeyDown={e => {
                  if (e.key === 'ArrowUp') { e.preventDefault(); onUpdate({ transportCost: Math.min(20, +(transportCost + 0.1).toFixed(1)) }) }
                  else if (e.key === 'ArrowDown') { e.preventDefault(); onUpdate({ transportCost: Math.max(0.1, +(transportCost - 0.1).toFixed(1)) }) }
                }}
                className="w-16 text-xs font-mono font-semibold text-center py-1 px-1 outline-none cursor-default bg-transparent text-foreground focus:bg-secondary/50 focus:ring-1 focus:ring-border"
              />
              <div className="flex flex-col border-l border-border">
                <button onClick={() => onUpdate({ transportCost: Math.min(20, +(transportCost + 0.1).toFixed(1)) })} className="px-1 py-0 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><ChevronUp className="h-3 w-3" /></button>
                <button onClick={() => onUpdate({ transportCost: Math.max(0.1, +(transportCost - 0.1).toFixed(1)) })} className="px-1 py-0 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border-t border-border"><ChevronDown className="h-3 w-3" /></button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/70">{TRANSPORT_UNITS[transportMode]}</span>
            <Select value={transportMode} onValueChange={(v: string) => onUpdate({ transportMode: v })}>
              <SelectTrigger size="sm" className="h-auto py-1 px-1.5 text-[10px] w-16 gap-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="estimated">{TRANSPORT_LABELS.estimated}</SelectItem>
                <SelectItem value="real">{TRANSPORT_LABELS.real}</SelectItem>
                <SelectItem value="time">{TRANSPORT_LABELS.time}</SelectItem>
              </SelectContent>
            </Select>
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
          <Users className="h-4 w-4 text-green-600" />
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
              className="text-xs text-green-600 hover:text-green-500 font-medium"
            >
              {selectedCount === farmers.length ? 'Clear all' : 'Select all'}
            </button>
          </div>
          {selectedCount > 0 && (
            <span className="text-xs text-foreground">
              <span className="font-semibold text-green-600">{selectedCount}</span> selected
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
              'bg-green-600 hover:bg-green-600'
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

type ContactRecencyExclude = 'lt3d' | 'lt7d' | 'lt30d' | 'never'
type ContactTypeExclude = 'SPOT_SALE' | 'INBOUND_CALL' | 'OUTBOUND_CALL' | 'SITE_VISIT'

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
  const color = daysAgo <= 3 ? 'text-amber-400' : (lc.contact_type === 'SPOT_SALE' && daysAgo <= 14) ? 'text-green-600' : 'text-muted-foreground/60'
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
  const [excludeRecency, setExcludeRecency] = useState<Set<ContactRecencyExclude>>(new Set(['lt30d']))
  const [excludeType, setExcludeType] = useState<Set<ContactTypeExclude>>(new Set(['SPOT_SALE', 'INBOUND_CALL']))
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleRecency = (v: ContactRecencyExclude) => {
    setExcludeRecency(prev => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v); else next.add(v)
      return next
    })
  }
  const toggleType = (v: ContactTypeExclude) => {
    setExcludeType(prev => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v); else next.add(v)
      return next
    })
  }

  // Apply exclusion filters
  const filteredFarmers = useMemo(() => {
    return farmers.filter(f => {
      // Acres filter

      const ci = contactInfo(f.last_contact)

      // Recency exclusions — exclude farmers matching ANY selected recency
      if (excludeRecency.has('never') && !f.last_contact) return false
      if (excludeRecency.has('lt3d') && ci.daysAgo !== null && ci.daysAgo <= 3) return false
      if (excludeRecency.has('lt7d') && ci.daysAgo !== null && ci.daysAgo <= 7) return false
      if (excludeRecency.has('lt30d') && ci.daysAgo !== null && ci.daysAgo <= 30) return false

      // Type exclusions — exclude farmers whose last contact matches ANY selected type
      if (f.last_contact && excludeType.has(f.last_contact.contact_type as ContactTypeExclude)) return false

      return true
    })
  }, [farmers, excludeRecency, excludeType])

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

  const hasFilters = excludeRecency.size > 0 || excludeType.size > 0
  const filterBtnClass = (active: boolean) => cn(
    'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
    active ? 'bg-green-600/10 text-green-600 border border-green-600/15' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-transparent'
  )

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      {/* Exclude filters */}
      <div className="border-b border-border">
        {/* Header — click to expand/collapse */}
        <div
          onClick={() => setFiltersExpanded(p => !p)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/30 transition-colors cursor-pointer select-none"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Filter className="h-3 w-3" /> Exclude
          </span>
          <div className="flex items-center gap-1.5">
            {hasFilters && !filtersExpanded && (
              <button
                onClick={e => { e.stopPropagation(); setExcludeRecency(new Set()); setExcludeType(new Set()) }}
                className="text-[9px] text-muted-foreground hover:text-foreground px-1"
              >
                Clear
              </button>
            )}
            <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", filtersExpanded && "rotate-180")} />
          </div>
        </div>

        {/* Collapsed chips */}
        {!filtersExpanded && hasFilters && (
          <div className="flex flex-wrap gap-1 px-3 pb-2">
            {[...excludeRecency].map(v => {
              const labels: Record<string, string> = { lt3d: "< 3d", lt7d: "< 7d", lt30d: "< 30d", never: "Never" }
              return (
                <span key={v} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-600/10 text-muted-foreground text-[9px] font-medium border border-green-600/15">
                  {labels[v]}
                  <button onClick={() => toggleRecency(v)} className="hover:text-foreground ml-0.5">
                    <X className="h-2 w-2" />
                  </button>
                </span>
              )
            })}
            {[...excludeType].map(v => {
              const labels: Record<string, string> = { SPOT_SALE: "Spot", INBOUND_CALL: "Inbound", OUTBOUND_CALL: "Outbound", SITE_VISIT: "Visit" }
              return (
                <span key={v} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-600/10 text-muted-foreground text-[9px] font-medium border border-green-600/15">
                  {labels[v]}
                  <button onClick={() => toggleType(v)} className="hover:text-foreground ml-0.5">
                    <X className="h-2 w-2" />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Expanded filter controls */}
        {filtersExpanded && (
          <div className="px-3 pb-3 space-y-2">
            {hasFilters && (
              <div className="flex justify-end">
                <button
                  onClick={() => { setExcludeRecency(new Set()); setExcludeType(new Set()) }}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Exclude by last contact recency */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Contacted within</span>
              <div className="flex flex-wrap gap-1">
                <button className={filterBtnClass(excludeRecency.has('lt3d'))} onClick={() => toggleRecency('lt3d')}>3 days</button>
                <button className={filterBtnClass(excludeRecency.has('lt7d'))} onClick={() => toggleRecency('lt7d')}>7 days</button>
                <button className={filterBtnClass(excludeRecency.has('lt30d'))} onClick={() => toggleRecency('lt30d')}>30 days</button>
                <button className={filterBtnClass(excludeRecency.has('never'))} onClick={() => toggleRecency('never')}>Never</button>
              </div>
            </div>

            {/* Exclude by contact type */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Contact type</span>
              <div className="flex flex-wrap gap-1">
                <button className={filterBtnClass(excludeType.has('SPOT_SALE'))} onClick={() => toggleType('SPOT_SALE')}>Spot sale</button>
                <button className={filterBtnClass(excludeType.has('OUTBOUND_CALL'))} onClick={() => toggleType('OUTBOUND_CALL')}>Outbound</button>
                <button className={filterBtnClass(excludeType.has('INBOUND_CALL'))} onClick={() => toggleType('INBOUND_CALL')}>Inbound</button>
                <button className={filterBtnClass(excludeType.has('SITE_VISIT'))} onClick={() => toggleType('SITE_VISIT')}>Visit</button>
              </div>
            </div>

            {hasFilters && (
              <div className="text-[10px] text-muted-foreground">
                Showing <span className="text-foreground font-medium">{filteredFarmers.length}</span> of {farmers.length} farmers
              </div>
            )}
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
                      <span className="text-[10px] bg-green-600/10 text-green-600 px-1.5 rounded-full font-medium">{groupSelected} sel</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{(stats?.totalAcres ?? 0).toLocaleString()} ac</span>
                    {(stats?.contactedLt7d ?? 0) > 0 && (
                      <span className="text-amber-400">{stats!.contactedLt7d} contacted &lt;7d</span>
                    )}
                    {(stats?.spotSales ?? 0) > 0 && (
                      <span className="text-green-600">{stats!.spotSales} spot sales</span>
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
                      farmer.id === selectedFarmerId ? 'bg-green-600/10' :
                      isChecked ? 'bg-green-600/5' : 'hover:bg-secondary/50'
                    )}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSelect(farmer.id) }}
                      className={cn(
                        'mt-0.5 h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
                        isChecked ? 'bg-green-600 border-green-600' : 'border-muted-foreground/40 hover:border-green-600/50'
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

const FarmerDetailPanel = memo(function FarmerDetailPanel({ farmer, elevators, onClose, onDrillDown, onSendToQueue, theme = 'dark', positions, contractBids, getContractBid, freightCentsPerMile, selectedElevatorId, originators = [] }: {
  farmer: Farmer
  elevators: Elevator[]
  onClose: () => void
  onDrillDown: () => void
  onSendToQueue?: () => void
  theme?: 'light' | 'dark'
  positions?: import('@/types/kernel').PositionSummary[]
  contractBids?: Record<string, any>
  getContractBid?: (posId: string, basis: number | null) => { posted: number; maxBid: number; increment: number; leeway: number; transportCost: number; transportMode: string }
  freightCentsPerMile?: number
  selectedElevatorId?: string | null
  originators?: import('@/types/kernel').User[]
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

  // Selectable contract months — all selected by default
  const eligiblePositions = useMemo(() =>
    (positions ?? []).filter(p => p.elevator_id === selectedElevatorId),
    [positions, selectedElevatorId]
  )
  const [selectedPosIds, setSelectedPosIds] = useState<Set<string>>(new Set())

  // Auto-select all when farmer or positions change
  useEffect(() => {
    setSelectedPosIds(new Set(eligiblePositions.map(p => p.id)))
  }, [farmer.id, eligiblePositions.length])

  const togglePos = (id: string) => {
    setSelectedPosIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const allPosSelected = eligiblePositions.length > 0 && selectedPosIds.size === eligiblePositions.length
  const nonePosSelected = selectedPosIds.size === 0

  // Originator assignment — default to farmer's assigned originator, allow override
  const [overrideOriginatorId, setOverrideOriginatorId] = useState<string | null>(null)
  useEffect(() => { setOverrideOriginatorId(null) }, [farmer.id])
  const activeOriginatorId = overrideOriginatorId ?? farmer.originator_id
  const activeOriginator = originators.find(o => o.id === activeOriginatorId)

  // Local send feedback state
  const [localSendStatus, setLocalSendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  useEffect(() => { setLocalSendStatus('idle') }, [farmer.id])


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
              <div className="h-2 w-2 rounded-sm bg-green-600" />
              {roadData ? (
                <>
                  <span className="text-green-600 font-medium">{roadData.ownMiles.toFixed(1)} mi</span>
                  <span className="text-muted-foreground/60">· {Math.round(roadData.ownMinutes)} min</span>
                  <span className="text-muted-foreground">to {proximity.nearestOwn.name}</span>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 border border-muted-foreground/30 border-t-green-600 rounded-full animate-spin" />
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
                <div className="rounded bg-green-600/10 border border-green-600/15 px-2 py-1 text-xs text-green-600 font-medium">
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


        {/* Assigned originator with override */}
        <div className="flex items-center justify-between py-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground truncate">Originator</span>
          </div>
          <select
            value={activeOriginatorId ?? ''}
            onChange={e => setOverrideOriginatorId(e.target.value || null)}
            className="text-xs bg-secondary/50 border border-border rounded-md px-2 py-1 text-foreground max-w-[140px] truncate outline-none focus:ring-1 focus:ring-ring"
          >
            {!farmer.originator_id && <option value="">Unassigned</option>}
            {originators.map(o => (
              <option key={o.id} value={o.id}>{o.name}{o.id === farmer.originator_id ? ' (assigned)' : ''}</option>
            ))}
          </select>
        </div>
        {overrideOriginatorId && overrideOriginatorId !== farmer.originator_id && (
          <div className="text-[9px] text-amber-500 flex items-center gap-1 -mt-1 mb-1">
            <span>\u26A0</span> Reassigned from {farmer.originator_name ?? 'unknown'} to {activeOriginator?.name ?? 'unknown'}
          </div>
        )}

        {/* Farmer Price Table — selectable contract months */}
        {eligiblePositions.length > 0 && (
          <div className="border-t border-border">
            {/* Header with select all / counter */}
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Calculated Prices
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground font-mono">
                  {selectedPosIds.size}/{eligiblePositions.length}
                </span>
                <button
                  onClick={() => setSelectedPosIds(allPosSelected ? new Set() : new Set(eligiblePositions.map(p => p.id)))}
                  className="text-[9px] text-green-600 hover:text-green-500 font-medium"
                >
                  {allPosSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto">
              <div className="grid grid-cols-[20px_1fr_1fr_1fr_1fr] px-3 py-1 text-[9px] font-semibold uppercase text-muted-foreground border-b border-border/50 sticky top-0 bg-card">
                <span></span>
                <span>Month</span>
                <span>Crop</span>
                <span className="text-right">Basis</span>
                <span className="text-right">Net</span>
              </div>
              {eligiblePositions.map(pos => {
                  const bid = getContractBid?.(pos.id, pos.current_basis)
                  const posted = bid?.posted ?? 15
                  const dist = ownDist ?? 0
                  const freightAdj = dist * (freightCentsPerMile ?? 5)
                  const netPrice = posted - freightAdj
                  const isSelected = selectedPosIds.has(pos.id)
                  return (
                    <button
                      key={pos.id}
                      onClick={() => togglePos(pos.id)}
                      className={cn(
                        'grid grid-cols-[20px_1fr_1fr_1fr_1fr] px-3 py-1 text-[10px] font-mono border-b border-border/30 transition-colors w-full text-left',
                        isSelected ? 'bg-green-600/5 hover:bg-green-600/10' : 'hover:bg-secondary/30 opacity-50'
                      )}
                    >
                      <span className="flex items-center">
                        <span className={cn(
                          'h-3 w-3 rounded border transition-colors',
                          isSelected ? 'bg-green-600 border-green-600' : 'border-muted-foreground/40'
                        )} />
                      </span>
                      <span className="text-foreground">{(MONTH_SHORT[pos.delivery_month] ?? pos.delivery_month) + ' ' + String(pos.crop_year).slice(2)}</span>
                      <span className="text-muted-foreground">{(CROP_LABELS[pos.crop] ?? pos.crop).substring(0, 4)}</span>
                      <span className="text-right text-foreground">-{(posted / 100).toFixed(2)}</span>
                      <span className={cn('text-right font-medium', netPrice >= 0 ? 'text-green-600' : 'text-red-400')}>
                        -{(netPrice / 100).toFixed(2)}
                      </span>
                    </button>
                  )
                })}
            </div>
          </div>
        )}

        {/* Action buttons — queue + simulated Salesforce */}
        <div className="space-y-1.5 mt-2">
          <button
            onClick={() => {
              if (nonePosSelected || localSendStatus === 'sending') return
              setLocalSendStatus('sending')
              onSendToQueue?.()
              setTimeout(() => setLocalSendStatus('sent'), 800)
              setTimeout(() => setLocalSendStatus('idle'), 3500)
            }}
            disabled={nonePosSelected || localSendStatus === 'sending'}
            className={cn(
              'w-full rounded-md text-white text-xs font-semibold py-2 transition-colors',
              localSendStatus === 'sent' ? 'bg-green-700'
                : localSendStatus === 'sending' ? 'bg-green-800 opacity-70'
                : nonePosSelected ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            )}
          >
            {localSendStatus === 'sending' ? 'Sending...'
              : localSendStatus === 'sent' ? '\u2713 Sent ' + selectedPosIds.size + ' to Queue'
              : 'Send ' + selectedPosIds.size + ' contract' + (selectedPosIds.size !== 1 ? 's' : '') + ' to Queue'}
          </button>

        </div>
      </div>
    </div>
  )
})
