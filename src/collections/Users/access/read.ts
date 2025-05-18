import type { Access, Where } from 'payload'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { User } from 'payload-types'
import { isAccessingViaSubdomain } from '@/collections/utilities/access/isAccessingViaSubdomain'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { hasReadPermission } from '@/utilities/getRolePermissions'

const readUsers: Access<User> = async ({ req }) => {
  const { user } = req
  if (!user) return false

  const superAdmin = isSuperAdmin(req)
  const selectedTenant = getSelectedTenantId(req) || (await getSelectedTenantToken())
  const isSubdomain = await isAccessingViaSubdomain(req)

  if (superAdmin) {
    if (!selectedTenant) return true
    return { 'tenants.tenant': { equals: selectedTenant } }
  }

  if (isSubdomain && hasReadPermission(user, selectedTenant, 'users')) {
    return true
  }

  return { id: { equals: user.id } } as Where
}

export default readUsers
