import { screen } from '@testing-library/react'
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

  it('shows Market Landscape title', () => {
    renderStrategyView()
    expect(screen.getByText('Market Landscape')).toBeInTheDocument()
  })

  it('shows elevator select in standalone mode', () => {
    renderStrategyView()
    expect(screen.getByText('Select elevator…')).toBeInTheDocument()
  })

  it('shows layer toggles in standalone mode', () => {
    renderStrategyView()
    expect(screen.getByText('Voronoi cells')).toBeInTheDocument()
    expect(screen.getByText('Farmer locations')).toBeInTheDocument()
    expect(screen.getByText('Competitors')).toBeInTheDocument()
  })

  it('shows locked context when launched from position', () => {
    renderStrategyView('?elevator=b1000000-0000-0000-0000-000000000001&crop=CORN&month=DEC&year=2025')
    expect(screen.getByText('Position Context')).toBeInTheDocument()
    expect(screen.getByText('Corn')).toBeInTheDocument()
    expect(screen.getByText('DEC 2025')).toBeInTheDocument()
    // Should NOT show the elevator select dropdown
    expect(screen.queryByText('Select elevator…')).not.toBeInTheDocument()
  })
})
