import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CoverageBar } from './CoverageBar'

describe('CoverageBar', () => {
  it('shows correct percentage', () => {
    render(<CoverageBar gap={120000} target={600000} />)
    expect(screen.getByTestId('coverage-pct')).toHaveTextContent('80%')
  })

  it('shows 100% when gap is null', () => {
    render(<CoverageBar gap={null} target={600000} />)
    expect(screen.getByTestId('coverage-pct')).toHaveTextContent('100%')
  })

  it('shows alert state (amber) when percentage < alertThreshold', () => {
    render(<CoverageBar gap={300000} target={600000} />)
    // 50% < 80 default threshold → alert
    expect(screen.getByTestId('coverage-pct')).toHaveClass('text-amber-400')
    expect(screen.getByTestId('coverage-fill')).toHaveClass('bg-amber-500')
  })

  it('shows normal state (green) when percentage >= alertThreshold', () => {
    render(<CoverageBar gap={60000} target={600000} />)
    // 90% >= 80 default threshold → normal
    expect(screen.getByTestId('coverage-pct')).toHaveClass('text-green-400')
    expect(screen.getByTestId('coverage-fill')).toHaveClass('bg-green-500')
  })

  it('shows gap text when showLabel=true and gap > 0', () => {
    render(<CoverageBar gap={120000} target={600000} showLabel />)
    expect(screen.getByText('120K bu gap')).toBeInTheDocument()
  })

  it('does not show gap text when gap is null', () => {
    render(<CoverageBar gap={null} target={600000} showLabel />)
    expect(screen.queryByText(/gap/)).not.toBeInTheDocument()
  })

  it('does not show label when showLabel=false', () => {
    render(<CoverageBar gap={120000} target={600000} showLabel={false} />)
    expect(screen.queryByTestId('coverage-pct')).not.toBeInTheDocument()
  })

  it('uses data-testid="coverage-pct" and data-testid="coverage-fill"', () => {
    render(<CoverageBar gap={100000} target={500000} />)
    expect(screen.getByTestId('coverage-pct')).toBeInTheDocument()
    expect(screen.getByTestId('coverage-fill')).toBeInTheDocument()
  })

  it('respects custom alertThreshold', () => {
    // gap=120000, target=600000 → 80%, threshold=90 → alert
    render(<CoverageBar gap={120000} target={600000} alertThreshold={90} />)
    expect(screen.getByTestId('coverage-pct')).toHaveClass('text-amber-400')
  })
})
