import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import { PositionView } from './PositionView'

describe('PositionView (integration)', () => {
  it('renders the position view container', () => {
    renderWithProviders(<PositionView />)
    expect(screen.getByTestId('position-view')).toBeInTheDocument()
  })

  it('shows multiple position cards', () => {
    renderWithProviders(<PositionView />)
    const cards = screen.getAllByTestId('position-card')
    expect(cards.length).toBeGreaterThan(1)
  })

  it('shows the position summary', () => {
    renderWithProviders(<PositionView />)
    expect(screen.getByTestId('position-summary')).toBeInTheDocument()
  })

  it('shows the alert feed', () => {
    renderWithProviders(<PositionView />)
    expect(screen.getByTestId('alert-feed')).toBeInTheDocument()
  })

  it('shows the correct default user name "Marcus Webb"', () => {
    renderWithProviders(<PositionView />)
    expect(screen.getByText(/Marcus Webb/)).toBeInTheDocument()
  })
})
