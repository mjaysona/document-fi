import type { Access, Where } from 'payload'
import { User } from 'payload-types'
import { hasDeletePermission } from '@/utilities/getRolePermissions'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { hasSuperAdminRole } from '@/utilities/getRole'

const deleteUsers: Access<User> = async (args) => {
  const { req } = args
  const { user } = req

  if (!user) return false

  const isSuperAdmin = hasSuperAdminRole(user?.userRoles)
  const hasPermission = hasDeletePermission(user, 'users')

  if (hasPermission) {
    if (isSuperAdmin)
      return {
        isSystemAccount: {
          equals: false,
        },
      } as Where

    return true
  }

  return false
}

export default deleteUsers
