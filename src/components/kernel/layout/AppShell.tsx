import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { BarChart3, Phone, Map, MessageSquare, Bell, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PersonaBadge } from '@/components/kernel/shared/PersonaBadge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

const navItems = [
  { to: '/merchandising', label: 'Merchandising', merchantLabel: 'Position', icon: BarChart3 },
  { to: '/sales', label: 'Sales', icon: Phone },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/strategy', label: 'Strategy', merchantLabel: 'Market Landscape', icon: Map },
  { to: '/signal', label: 'Signal', icon: MessageSquare },
] as const

export function AppShell() {
  const { currentUser, setCurrentUser, demoUsers } = useCurrentUser()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const selectItems = [
    { label: 'Select user', value: null },
    ...demoUsers.map(u => ({ label: `${u.name} (${u.persona})`, value: u.id })),
  ]

  const handleUserChange = (userId: string | null) => {
    if (!userId) return
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
      return ['Merchandising', 'Alerts', 'Strategy', 'Signal'].includes(item.label)
    }
    if (currentUser.persona === 'GOM') {
      return ['Sales', 'Alerts', 'Signal'].includes(item.label)
    }
    // HYBRID sees everything
    return true
  })

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <span className="text-sm font-bold">K</span>
                </div>
                <span className="text-sm font-bold uppercase tracking-widest">
                  Kernel
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleNav.map(item => {
                  const Icon = item.icon
                  const isActive = location.pathname.startsWith(item.to)
                  const label = currentUser.persona === 'MERCHANT' && 'merchantLabel' in item
                    ? item.merchantLabel
                    : item.label
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={label}
                        render={<NavLink to={item.to} />}
                      >
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarGroup>
            <SidebarGroupLabel>
              <span>Demo User</span>
              <PersonaBadge persona={currentUser.persona} className="ml-auto" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <Select items={selectItems} value={currentUser.id} onValueChange={handleUserChange}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} side="top">
                  <SelectGroup>
                    {selectItems.filter(i => i.value !== null).map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="px-2 text-[9px] font-medium text-muted-foreground">
                {currentUser.region}
              </p>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-10 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="ml-auto">
            <button
              onClick={toggleTheme}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          <div key={location.pathname} className="h-full animate-page-enter">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
