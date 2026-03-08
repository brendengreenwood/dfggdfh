import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { UserProvider } from '@/hooks/useCurrentUser'
import { describe, it, expect } from 'vitest'
import { InboundScreen } from './InboundScreen'

function renderInboundScreen(farmerId: string) {
  return render(
    <MemoryRouter initialEntries={[`/sales/inbound/${farmerId}`]}>
      <UserProvider>
        <Routes>
          <Route path="/sales/inbound/:farmerId" element={<InboundScreen />} />
        </Routes>
      </UserProvider>
    </MemoryRouter>
  )
}

describe('InboundScreen (integration)', () => {
  it('renders the inbound screen for a valid farmer', () => {
    renderInboundScreen('c1000000-0000-0000-0000-000000000003')
    expect(screen.getByTestId('inbound-screen')).toBeInTheDocument()
  })

  it('shows the farmer name "Bob Schroeder"', () => {
    renderInboundScreen('c1000000-0000-0000-0000-000000000003')
    expect(screen.getByTestId('inbound-farmer-name')).toHaveTextContent('Bob Schroeder')
  })

  it('shows the recommended basis section', () => {
    renderInboundScreen('c1000000-0000-0000-0000-000000000003')
    expect(screen.getByTestId('inbound-basis')).toBeInTheDocument()
  })

  it('shows three action buttons (Sold, No Sale, Callback)', () => {
    renderInboundScreen('c1000000-0000-0000-0000-000000000003')
    expect(screen.getByTestId('inbound-sold')).toBeInTheDocument()
    expect(screen.getByTestId('inbound-no-sale')).toBeInTheDocument()
    expect(screen.getByTestId('inbound-callback')).toBeInTheDocument()
  })

  it('shows "Farmer not found" for an invalid farmerId', () => {
    renderInboundScreen('invalid-farmer-id')
    expect(screen.getByText('Farmer not found')).toBeInTheDocument()
  })
})
