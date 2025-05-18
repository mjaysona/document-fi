import type { Access, Where } from 'payload'
import { User } from 'payload-types'
import { isAccessingViaSubdomain } from '@/collections/utilities/access/isAccessingViaSubdomain'
import { hasUpdatePermission } from '@/utilities/getRolePermissions'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { hasSuperAdminRole } from '@/utilities/getRole'

const updateUsers: Access<User> = async (args) => {
  const { req } = args
  const { user } = req

  if (!user) return false

  const isSuperAdmin = hasSuperAdminRole(user?.roles)
  const subdomainAccess = await isAccessingViaSubdomain(req)
  const selectedTenant = getSelectedTenantId(req) || (await getSelectedTenantToken())
  const hasPermission = hasUpdatePermission(user, selectedTenant, 'users', subdomainAccess)

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
