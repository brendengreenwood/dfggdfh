import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PersonaBadge } from './PersonaBadge'

describe('PersonaBadge', () => {
  it('renders "Merchant" for MERCHANT persona', () => {
    render(<PersonaBadge persona="MERCHANT" />)
    expect(screen.getByTestId('persona-badge')).toHaveTextContent('Merchant')
  })

  it('renders "GOM" for GOM persona', () => {
    render(<PersonaBadge persona="GOM" />)
    expect(screen.getByTestId('persona-badge')).toHaveTextContent('GOM')
  })

  it('renders "Hybrid" for HYBRID persona', () => {
    render(<PersonaBadge persona="HYBRID" />)
    expect(screen.getByTestId('persona-badge')).toHaveTextContent('Hybrid')
  })

  it('renders "CSR" for CSR persona', () => {
    render(<PersonaBadge persona="CSR" />)
    expect(screen.getByTestId('persona-badge')).toHaveTextContent('CSR')
  })

  it('renders "Strategic" for STRATEGIC persona', () => {
    render(<PersonaBadge persona="STRATEGIC" />)
    expect(screen.getByTestId('persona-badge')).toHaveTextContent('Strategic')
  })

  it('renders "Manager" for MANAGER persona', () => {
    render(<PersonaBadge persona="MANAGER" />)
    expect(screen.getByTestId('persona-badge')).toHaveTextContent('Manager')
  })

  it('uses data-testid="persona-badge"', () => {
    render(<PersonaBadge persona="MERCHANT" />)
    expect(screen.getByTestId('persona-badge')).toBeInTheDocument()
  })
})
