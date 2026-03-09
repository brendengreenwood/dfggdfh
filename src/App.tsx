import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { UserProvider } from '@/hooks/useCurrentUser'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/kernel/layout/AppShell'
import { MerchandisingShell } from '@/components/kernel/layout/MerchandisingShell'
import { SalesShell } from '@/components/kernel/layout/SalesShell'
import { PositionView } from '@/components/kernel/merchandising/PositionView'
import { DispatchQueue } from '@/components/kernel/sales/DispatchQueue'
import { InboundScreen } from '@/components/kernel/sales/InboundScreen'
import { StrategyView } from '@/components/kernel/strategy/StrategyView'
import { AlertsView } from '@/components/kernel/alerts/AlertsView'
import { SignalChat } from '@/components/kernel/signal/SignalChat'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <UserProvider>
        <TooltipProvider>
        <Routes>
          {/* Inbound screen is full-screen overlay — outside AppShell */}
          <Route path="/sales/inbound/:farmerId" element={<InboundScreen />} />

          {/* Main layout */}
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/merchandising" replace />} />

            <Route path="/merchandising" element={<MerchandisingShell />}>
              <Route index element={<PositionView />} />
            </Route>

            <Route path="/sales" element={<SalesShell />}>
              <Route index element={<DispatchQueue />} />
            </Route>

            <Route path="/strategy" element={<StrategyView />} />
            <Route path="/alerts" element={<AlertsView />} />
            <Route path="/signal" element={<SignalChat />} />
          </Route>
        </Routes>
        </TooltipProvider>
      </UserProvider>
    </BrowserRouter>
    </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
