import { Map, Layers, Filter } from 'lucide-react'

export function StrategyView() {
  return (
    <div className="flex h-[calc(100vh-2rem)] gap-0" data-testid="strategy-view">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border bg-card p-4 space-y-4 overflow-auto">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Territory Map
        </h2>

        {/* Elevator list placeholder */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Elevators
            </span>
          </div>
          {['Ames Main', 'Nevada Terminal', 'Atlantic Main', 'Harlan Station', 'Red Oak Depot'].map(name => (
            <div
              key={name}
              className="rounded-md border border-border bg-secondary p-2.5"
            >
              <span className="text-sm text-zinc-300">{name}</span>
            </div>
          ))}
        </div>

        {/* Filters placeholder */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Layers
            </span>
          </div>
          {['Competitor bids', 'Crop stress', 'Farmer locations', 'Coverage gaps'].map(layer => (
            <label key={layer} className="flex items-center gap-2 cursor-pointer">
              <div className="h-3.5 w-3.5 rounded-sm border border-input bg-secondary" />
              <span className="text-sm text-zinc-500">{layer}</span>
            </label>
          ))}
        </div>

        {/* ML signals placeholder */}
        <div className="rounded-md border border-violet-700/30 bg-violet-900/10 p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-violet-400 block mb-2">
            ML Signals
          </span>
          <p className="text-xs text-zinc-500">
            Spatial intelligence signals will appear here once the map layer is connected.
          </p>
        </div>
      </aside>

      {/* Map canvas */}
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Map className="h-16 w-16 text-stone-700 mx-auto" />
          <h3 className="text-xl font-bold uppercase tracking-wider text-zinc-600">
            Map Canvas
          </h3>
          <p className="text-sm text-zinc-600 max-w-sm">
            Territory map with elevator locations, farmer parcels, competitor positions, and ML-driven sequencing.
          </p>
          <p className="font-mono text-[10px] font-medium text-zinc-700">
            Layout stub — map library integration pending
          </p>
        </div>
      </div>
    </div>
  )
}
