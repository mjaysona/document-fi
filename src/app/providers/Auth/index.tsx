'use client'

import { createContext, useContext } from 'react'
import { User } from '~/payload-types'

type AuthContextType = {
  user: User | null
  isValidSession: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isValidSession: false,
})

const useAuth = () => useContext(AuthContext)

const AuthProvider = ({
  children,
  user,
  isValidSession,
}: {
  children: React.ReactNode
  user: User | null
  isValidSession: boolean
}) => {
  return <AuthContext.Provider value={{ user, isValidSession }}>{children}</AuthContext.Provider>
}

export { AuthProvider, useAuth }
