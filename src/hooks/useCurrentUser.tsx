import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { User, PersonaType } from '@/types/kernel'

interface UserContextValue {
  currentUser: User
  setCurrentUser: (userId: string) => void
  demoUsers: User[]
  allUsers: User[]
  startRoute: string
  isError: boolean
  error: Error | null
}

const UserContext = createContext<UserContextValue | null>(null)

function getStartRoute(persona: PersonaType): string {
  switch (persona) {
    case 'MERCHANT':
      return '/merchandising'
    case 'GOM':
      return '/sales'
    case 'HYBRID':
      return '/merchandising'
    case 'MANAGER':
      return '/insights'
    default:
      return '/merchandising'
  }
}

// Fallback user for initial render before API loads
const fallbackUser: User = {
  id: 'a1000000-0000-0000-0000-000000000001',
  name: 'Marcus Webb',
  email: 'mwebb@cargill.com',
  persona: 'MERCHANT',
  region: 'Iowa Central',
}

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: allUsers = [], isError, error } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`)
      return res.json()
    },
  })

  const [currentUser, setUser] = useState<User>(fallbackUser)

  // Once users load, ensure currentUser is synced to real data
  useEffect(() => {
    if (allUsers.length > 0) {
      const match = allUsers.find(u => u.id === currentUser.id)
      if (match) {
        setUser(match)
      } else {
        // Default to first demo user
        const demo = allUsers.find(u =>
          ['MERCHANT', 'HYBRID', 'GOM'].includes(u.persona)
        )
        if (demo) setUser(demo)
      }
    }
  }, [allUsers]) // eslint-disable-line react-hooks/exhaustive-deps

  const demoUsers = allUsers.filter(u =>
    ['MERCHANT', 'HYBRID', 'GOM'].includes(u.persona)
  )

  const setCurrentUser = useCallback((userId: string) => {
    const user = allUsers.find(u => u.id === userId)
    if (user) setUser(user)
  }, [allUsers])

  const startRoute = getStartRoute(currentUser.persona)

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, demoUsers, allUsers, startRoute, isError, error: error ?? null }}>
      {children}
    </UserContext.Provider>
  )
}

export function useCurrentUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useCurrentUser must be used within a UserProvider')
  }
  return context
}
