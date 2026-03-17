import { useMemo } from 'react'

interface Series {
  label: string
  color: string
  data: number[] // one value per date
}

interface BidTrendChartProps {
  dates: string[]
  series: Series[]
  height?: number
}

/**
 * Lightweight SVG sparkline chart showing bid trend lines.
 * No external charting library — just polylines on an SVG canvas.
 */
export function BidTrendChart({ dates, series, height = 120 }: BidTrendChartProps) {
  const width = 280
  const pad = { top: 12, right: 8, bottom: 24, left: 32 }

  const { yMin, yMax, paths, yTicks, xTicks } = useMemo(() => {
    // Find global y range across all series
    let lo = Infinity, hi = -Infinity
    for (const s of series) {
      for (const v of s.data) {
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
    }
    // Add padding to y range
    const range = hi - lo || 1
    lo = Math.floor(lo - range * 0.1)
    hi = Math.ceil(hi + range * 0.1)

    const plotW = width - pad.left - pad.right
    const plotH = height - pad.top - pad.bottom
    const n = dates.length

    // Build SVG polyline paths
    const paths = series.map(s => {
      const points = s.data.map((v, i) => {
        const x = pad.left + (i / (n - 1)) * plotW
        const y = pad.top + plotH - ((v - lo) / (hi - lo)) * plotH
        return `${x},${y}`
      })
      return { ...s, d: `M${points.join('L')}` }
    })

    // Y axis ticks (3-5 values)
    const step = Math.max(1, Math.round((hi - lo) / 4))
    const yTicks: number[] = []
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      yTicks.push(v)
    }

    // X axis ticks — show ~4 month labels
    const xTicks: { x: number; label: string }[] = []
    const monthsSeen = new Set<string>()
    for (let i = 0; i < n; i++) {
      const d = dates[i]
      const monthKey = d.slice(0, 7) // YYYY-MM
      if (!monthsSeen.has(monthKey)) {
        monthsSeen.add(monthKey)
        // Show every 3rd month
        if (monthsSeen.size % 3 === 1) {
          const dt = new Date(d)
          const label = dt.toLocaleDateString('en-US', { month: 'short' })
          xTicks.push({ x: pad.left + (i / (n - 1)) * plotW, label })
        }
      }
    }

    return { yMin: lo, yMax: hi, paths, yTicks, xTicks }
  }, [dates, series, height])

  const plotH = height - pad.top - pad.bottom
  const plotW = width - pad.left - pad.right

  return (
    <div className="space-y-1.5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
      >
        {/* Grid lines */}
        {yTicks.map(v => {
          const y = pad.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH
          return (
            <g key={v}>
              <line
                x1={pad.left} x2={pad.left + plotW}
                y1={y} y2={y}
                stroke="currentColor" strokeOpacity={0.1}
              />
              <text
                x={pad.left - 4} y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize={8}
              >
                {v}¢
              </text>
            </g>
          )
        })}

        {/* X axis labels */}
        {xTicks.map(t => (
          <text
            key={t.label + t.x}
            x={t.x} y={height - 4}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={8}
          >
            {t.label}
          </text>
        ))}

        {/* Trend lines */}
        {paths.map(p => (
          <path
            key={p.label}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* End dots */}
        {paths.map(p => {
          const lastIdx = series.find(s => s.label === p.label)!.data.length - 1
          const lastVal = series.find(s => s.label === p.label)!.data[lastIdx]
          const x = pad.left + (lastIdx / (dates.length - 1)) * plotW
          const y = pad.top + plotH - ((lastVal - yMin) / (yMax - yMin)) * plotH
          return (
            <circle key={p.label + '-dot'} cx={x} cy={y} r={2.5} fill={p.color} />
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-3 px-1">
        {series.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-3 h-[2px] rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[9px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
