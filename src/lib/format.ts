// ── KERNEL FORMATTING UTILITIES ──
// Grain basis is expressed as cents relative to a futures contract month.
// Display format: "14¢ under Dec" or "-0.14" depending on context.

/**
 * Format basis as trader-readable string: "14¢ under" or "3¢ over"
 */
export function formatBasis(value: number | null): string {
  if (value === null) return '—'
  if (value === 0) return 'even'
  const cents = Math.round(Math.abs(value) * 100)
  const direction = value < 0 ? 'under' : 'over'
  return `${cents}¢ ${direction}`
}

/**
 * Format basis as short numeric: "-14.0¢" or "+3.0¢"
 */
export function formatBasisShort(value: number | null): string {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)}¢`
}

/**
 * Format bushels with K/M suffixes: "480K bu" or "1.2M bu"
 */
export function formatBushels(value: number | null): string {
  if (value === null) return '—'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M bu`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K bu`
  return `${value} bu`
}

/**
 * Return Tailwind color class for basis delta.
 * Negative delta = conservative (posting below rec) → sky
 * Positive delta = aggressive (posting above rec) → amber
 * Near zero = within range → green
 */
export function basisColor(value: number | null): string {
  if (value === null) return 'text-stone-400'
  if (value > 0.02) return 'text-amber-400'
  if (value < -0.02) return 'text-sky-400'
  return 'text-green-400'
}

/**
 * Calculate coverage percentage: how much of target is filled.
 * Returns 100 if no gap or no target.
 */
export function coveragePct(gap: number | null, target: number | null): number {
  if (!gap || !target || target === 0) return 100
  return Math.round(((target - gap) / target) * 100)
}
