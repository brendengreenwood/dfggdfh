import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { users } from '@/data/mock'
import type { User, PersonaType } from '@/types/kernel'

interface UserContextValue {
  currentUser: User
  setCurrentUser: (userId: string) => void
  demoUsers: User[]
  startRoute: string
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

// Demo users: Marcus (Merchant), Dana (Hybrid), Tyler (GOM)
const demoUsers = users.filter(u => ['MERCHANT', 'HYBRID', 'GOM'].includes(u.persona))

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setUser] = useState<User>(demoUsers[0])

  const setCurrentUser = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user) setUser(user)
  }, [])

  const startRoute = getStartRoute(currentUser.persona)

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, demoUsers, startRoute }}>
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
