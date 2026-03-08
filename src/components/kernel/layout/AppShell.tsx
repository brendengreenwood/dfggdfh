import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Phone, Map, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PersonaBadge } from '@/components/kernel/shared/PersonaBadge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const navItems = [
  { to: '/merchandising', label: 'Merchandising', icon: BarChart3, accent: 'sky' },
  { to: '/sales', label: 'Sales', icon: Phone, accent: 'amber' },
  { to: '/strategy', label: 'Strategy', icon: Map, accent: 'stone' },
  { to: '/signal', label: 'Signal', icon: MessageSquare, accent: 'violet' },
] as const

type AccentType = typeof navItems[number]['accent']

const accentBorder: Record<AccentType, string> = {
  sky: 'border-l-sky-400',
  amber: 'border-l-amber-400',
  stone: 'border-l-zinc-400',
  violet: 'border-l-violet-400',
}

const accentText: Record<AccentType, string> = {
  sky: 'text-sky-400',
  amber: 'text-amber-400',
  stone: 'text-zinc-300',
  violet: 'text-violet-400',
}

export function AppShell() {
  const { currentUser, setCurrentUser, demoUsers } = useCurrentUser()
  const navigate = useNavigate()

  const handleUserChange = (userId: string) => {
    setCurrentUser(userId)
    const user = demoUsers.find(u => u.id === userId)
    if (user) {
      const route = user.persona === 'MERCHANT' ? '/merchandising' :
                    user.persona === 'GOM' ? '/sales' : '/merchandising'
      navigate(route)
    }
  }

  // Filter nav items based on persona
  const visibleNav = navItems.filter(item => {
    if (currentUser.persona === 'MERCHANT') {
      return ['Merchandising', 'Strategy', 'Signal'].includes(item.label)
    }
    if (currentUser.persona === 'GOM') {
      return ['Sales', 'Signal'].includes(item.label)
    }
    // HYBRID sees everything
    return true
  })

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-border bg-card">
        {/* Logo area */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500">
            <span className="text-sm font-bold text-background">K</span>
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">
              Kernel
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-3">
          {visibleNav.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? cn('bg-secondary', accentBorder[item.accent], accentText[item.accent])
                      : 'border-l-transparent text-muted-foreground hover:bg-secondary hover:text-zinc-200'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {item.label}
                </span>
              </NavLink>
            )
          })}
        </nav>

        {/* User switcher */}
        <div className="border-t border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Demo User
            </span>
            <PersonaBadge persona={currentUser.persona} />
          </div>
          <Select value={currentUser.id} onValueChange={handleUserChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {demoUsers.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.persona})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] font-medium text-zinc-600">
            {currentUser.region}
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
