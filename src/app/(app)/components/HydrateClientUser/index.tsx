'use client'

import type { PayloadRequest, Permissions, SanitizedPermissions } from 'payload'
import { useEffect } from 'react'
import { useAuth } from '../../providers/Auth'

export const HydrateClientUser: React.FC<{
  permissions: SanitizedPermissions
  user: PayloadRequest['user']
}> = ({ permissions, user }) => {
  const { setPermissions, setUser } = useAuth()

  useEffect(() => {
    setUser(user)
    setPermissions(permissions)
  }, [user, permissions, setUser, setPermissions])

  return null
}
