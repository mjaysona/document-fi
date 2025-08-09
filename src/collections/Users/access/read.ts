import type { Access, Where } from 'payload'
import { User } from 'payload-types'
import { hasReadPermission } from '@/utilities/getRolePermissions'
import { hasSuperAdminRole } from '@/utilities/getRole'

const readUsers: Access<User> = async ({ req }) => {
  const { user } = req
  if (!user) return false

  const isSuperAdmin = hasSuperAdminRole(user?.userRoles)

  return isSuperAdmin || hasReadPermission(user, 'users') || ({ id: { equals: user.id } } as Where)
}

export default readUsers
