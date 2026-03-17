import { screen, waitFor } from '@testing-library/react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { UserProvider } from '@/hooks/useCurrentUser'
import { StrategyView } from './StrategyView'

// Mock Leaflet — it needs a real DOM with dimensions
vi.mock('./LandscapeMap', () => ({
  LandscapeMap: ({ elevators, farmers }: { elevators: unknown[]; farmers: unknown[] }) => (
    <div data-testid="landscape-map">
      <span data-testid="map-elevator-count">{Array.isArray(elevators) ? elevators.length : 0}</span>
      <span data-testid="map-farmer-count">{Array.isArray(farmers) ? farmers.length : 0}</span>
    </div>
  ),
}))

function renderStrategyView(search = '') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/strategy${search}`]}>
        <UserProvider>
          <StrategyView />
        </UserProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('StrategyView', () => {
  it('renders the strategy view container', () => {
    renderStrategyView()
    expect(screen.getByTestId('strategy-view')).toBeInTheDocument()
  })

  it('renders the landscape map', () => {
    renderStrategyView()
    expect(screen.getByTestId('landscape-map')).toBeInTheDocument()
  })

  it('shows elevator selector in sidebar', () => {
    renderStrategyView()
    expect(screen.getByTestId('positions-sidebar')).toBeInTheDocument()
    expect(screen.getByText('Select elevator…')).toBeInTheDocument()
  })

  it('shows layer toggles on the map', () => {
    renderStrategyView()
    expect(screen.getByText('Producers')).toBeInTheDocument()
    expect(screen.getAllByText('Competitors').length).toBeGreaterThanOrEqual(1)
  })

  it('shows crop pills and contracts when launched with elevator', async () => {
    renderStrategyView('?elevator=b1000000-0000-0000-0000-000000000001&crop=CORN&month=DEC&year=2025')
    // Wait for contracts to load, then check contract cards + crop pills exist
    await screen.findByText("Dec '25")
    // "Corn" appears in both crop pills and contract cards — check getAllByText for multiple
    expect(screen.getAllByText('Corn').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Soybeans').length).toBeGreaterThanOrEqual(1)
  })

  it('shows bid setup panel when launched with position params', async () => {
    renderStrategyView('?elevator=b1000000-0000-0000-0000-000000000001&crop=CORN&month=DEC&year=2025')
    // Bid setup panel should appear with position context (async data fetch)
    const panel = await screen.findByTestId('bid-setup-panel')
    expect(panel).toBeInTheDocument()
    expect(panel.querySelector('[class*="font-medium"]')).toBeInTheDocument()
  })
})
