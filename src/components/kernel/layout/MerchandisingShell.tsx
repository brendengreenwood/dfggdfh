import { Outlet } from 'react-router-dom'

export function MerchandisingShell() {
  return (
    <div className="h-full">
      {/* Sky blue top accent line for Merchandising pod */}
      <div className="h-0.5 bg-sky-500" />
      <div className="p-6">
        <Outlet />
      </div>
    </div>
  )
}
