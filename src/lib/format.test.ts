import { describe, it, expect } from 'vitest'
import { formatBasis, formatBasisShort, formatBushels, basisColor, coveragePct } from './format'

describe('formatBasis', () => {
  it('formats negative basis as "under"', () => {
    expect(formatBasis(-0.14)).toBe('14¢ under')
  })

  it('formats positive basis as "over"', () => {
    expect(formatBasis(0.03)).toBe('3¢ over')
  })

  it('formats zero as "even"', () => {
    expect(formatBasis(0)).toBe('even')
  })

  it('returns em dash for null', () => {
    expect(formatBasis(null)).toBe('—')
  })

  it('rounds to nearest cent', () => {
    expect(formatBasis(-0.125)).toBe('13¢ under')
    expect(formatBasis(-0.1249)).toBe('12¢ under')
  })
})

describe('formatBasisShort', () => {
  it('formats negative basis with no sign prefix', () => {
    expect(formatBasisShort(-0.14)).toBe('-14.0¢')
  })

  it('formats positive basis with + prefix', () => {
    expect(formatBasisShort(0.03)).toBe('+3.0¢')
  })

  it('formats zero', () => {
    expect(formatBasisShort(0)).toBe('0.0¢')
  })

  it('returns em dash for null', () => {
    expect(formatBasisShort(null)).toBe('—')
  })

  it('preserves one decimal place', () => {
    expect(formatBasisShort(-0.125)).toBe('-12.5¢')
  })
})

describe('formatBushels', () => {
  it('formats millions', () => {
    expect(formatBushels(1200000)).toBe('1.2M bu')
    expect(formatBushels(2500000)).toBe('2.5M bu')
  })

  it('formats thousands', () => {
    expect(formatBushels(480000)).toBe('480K bu')
    expect(formatBushels(1000)).toBe('1K bu')
  })

  it('formats small values without suffix', () => {
    expect(formatBushels(500)).toBe('500 bu')
    expect(formatBushels(0)).toBe('0 bu')
  })

  it('returns em dash for null', () => {
    expect(formatBushels(null)).toBe('—')
  })
})

describe('basisColor', () => {
  it('returns amber for aggressive (positive delta > 0.02)', () => {
    expect(basisColor(0.03)).toBe('text-amber-400')
    expect(basisColor(0.05)).toBe('text-amber-400')
  })

  it('returns sky for conservative (negative delta < -0.02)', () => {
    expect(basisColor(-0.03)).toBe('text-sky-400')
    expect(basisColor(-0.05)).toBe('text-sky-400')
  })

  it('returns green for neutral (within ±0.02)', () => {
    expect(basisColor(0.01)).toBe('text-green-400')
    expect(basisColor(-0.01)).toBe('text-green-400')
    expect(basisColor(0)).toBe('text-green-400')
    expect(basisColor(0.02)).toBe('text-green-400')
    expect(basisColor(-0.02)).toBe('text-green-400')
  })

  it('returns stone for null', () => {
    expect(basisColor(null)).toBe('text-stone-400')
  })
})

describe('coveragePct', () => {
  it('calculates correct coverage percentage', () => {
    expect(coveragePct(120000, 600000)).toBe(80)
    expect(coveragePct(60000, 350000)).toBe(83)
  })

  it('returns 100 for null gap', () => {
    expect(coveragePct(null, 600000)).toBe(100)
  })

  it('returns 100 for null target', () => {
    expect(coveragePct(120000, null)).toBe(100)
  })

  it('returns 100 for zero target', () => {
    expect(coveragePct(120000, 0)).toBe(100)
  })

  it('returns 100 for zero gap', () => {
    expect(coveragePct(0, 600000)).toBe(100)
  })

  it('returns 0 for gap equal to target', () => {
    expect(coveragePct(600000, 600000)).toBe(0)
  })
})
