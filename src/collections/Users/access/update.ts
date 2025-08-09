import type { Access, Where } from 'payload'
import { User } from 'payload-types'
import { hasUpdatePermission } from '@/utilities/getRolePermissions'
import { hasSuperAdminRole } from '@/utilities/getRole'

const updateUsers: Access<User> = async (args) => {
  const { req } = args
  const { user } = req

  if (!user) return false

  const isSuperAdmin = hasSuperAdminRole(user?.userRoles)
  const hasPermission = hasUpdatePermission(user, 'users')

  if (hasPermission) {
    if (isSuperAdmin) return true

    return {
      isSystemAccount: {
        not_equals: true,
      },
    } as Where
  }

  return false
}

export default updateUsers
