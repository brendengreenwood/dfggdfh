import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AlertBadge } from './AlertBadge'

describe('AlertBadge', () => {
  it('renders "Competitor" for COMPETITOR_BID_MOVE', () => {
    render(<AlertBadge type="COMPETITOR_BID_MOVE" />)
    expect(screen.getByTestId('alert-badge')).toHaveTextContent('Competitor')
  })

  it('renders "Coverage" for COVERAGE_GAP', () => {
    render(<AlertBadge type="COVERAGE_GAP" />)
    expect(screen.getByTestId('alert-badge')).toHaveTextContent('Coverage')
  })

  it('renders "Inbound" for INBOUND_CALL', () => {
    render(<AlertBadge type="INBOUND_CALL" />)
    expect(screen.getByTestId('alert-badge')).toHaveTextContent('Inbound')
  })

  it('renders "Futures" for FUTURES_MOVE', () => {
    render(<AlertBadge type="FUTURES_MOVE" />)
    expect(screen.getByTestId('alert-badge')).toHaveTextContent('Futures')
  })

  it('renders "Crop Stress" for CROP_STRESS_EVENT', () => {
    render(<AlertBadge type="CROP_STRESS_EVENT" />)
    expect(screen.getByTestId('alert-badge')).toHaveTextContent('Crop Stress')
  })

  it('renders "Contract" for CONTRACT_CLOSED', () => {
    render(<AlertBadge type="CONTRACT_CLOSED" />)
    expect(screen.getByTestId('alert-badge')).toHaveTextContent('Contract')
  })

  it('renders "Position" for POSITION_THRESHOLD', () => {
    render(<AlertBadge type="POSITION_THRESHOLD" />)
    expect(screen.getByTestId('alert-badge')).toHaveTextContent('Position')
  })

  it('uses data-testid="alert-badge"', () => {
    render(<AlertBadge type="COMPETITOR_BID_MOVE" />)
    expect(screen.getByTestId('alert-badge')).toBeInTheDocument()
  })
})
