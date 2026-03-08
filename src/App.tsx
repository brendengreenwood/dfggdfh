import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider } from '@/hooks/useCurrentUser'
import { AppShell } from '@/components/kernel/layout/AppShell'
import { MerchandisingShell } from '@/components/kernel/layout/MerchandisingShell'
import { SalesShell } from '@/components/kernel/layout/SalesShell'
import { PositionView } from '@/components/kernel/merchandising/PositionView'
import { DispatchQueue } from '@/components/kernel/sales/DispatchQueue'
import { InboundScreen } from '@/components/kernel/sales/InboundScreen'
import { StrategyView } from '@/components/kernel/strategy/StrategyView'
import { SignalChat } from '@/components/kernel/signal/SignalChat'

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
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
            <Route path="/signal" element={<SignalChat />} />
          </Route>
        </Routes>
      </UserProvider>
    </BrowserRouter>
  )
}

export default App
