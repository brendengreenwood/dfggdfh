import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserProvider } from '@/hooks/useCurrentUser'
import { describe, it, expect } from 'vitest'
import { InboundScreen } from './InboundScreen'

function renderInboundScreen(farmerId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/sales/inbound/${farmerId}`]}>
        <UserProvider>
          <Routes>
            <Route path="/sales/inbound/:farmerId" element={<InboundScreen />} />
          </Routes>
        </UserProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('InboundScreen (integration)', () => {
  it('renders the inbound screen for a valid farmer', async () => {
    renderInboundScreen('c1000000-0000-0000-0000-000000000003')
    expect(await screen.findByTestId('inbound-screen')).toBeInTheDocument()
  })

  it('shows the farmer name "Bob Schroeder"', async () => {
    renderInboundScreen('c1000000-0000-0000-0000-000000000003')
    const el = await screen.findByTestId('inbound-farmer-name')
    expect(el).toHaveTextContent('Bob Schroeder')
  })

  it('shows the recommended basis section', async () => {
    renderInboundScreen('c1000000-0000-0000-0000-000000000003')
    expect(await screen.findByTestId('inbound-basis')).toBeInTheDocument()
  })

  it('shows three action buttons (Sold, No Sale, Callback)', async () => {
    renderInboundScreen('c1000000-0000-0000-0000-000000000003')
    expect(await screen.findByTestId('inbound-sold')).toBeInTheDocument()
    expect(screen.getByTestId('inbound-no-sale')).toBeInTheDocument()
    expect(screen.getByTestId('inbound-callback')).toBeInTheDocument()
  })

  it('shows "Farmer not found" for an invalid farmerId', async () => {
    renderInboundScreen('invalid-farmer-id')
    expect(await screen.findByText('Farmer not found')).toBeInTheDocument()
  })
})
