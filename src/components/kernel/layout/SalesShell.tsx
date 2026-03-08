import { Outlet } from 'react-router-dom'

export function SalesShell() {
  return (
    <div className="h-full">
      {/* Amber top accent line for Sales pod */}
      <div className="h-0.5 bg-amber-500" />
      <div className="p-6 md:p-6 p-4">
        <Outlet />
      </div>
    </div>
  )
}
