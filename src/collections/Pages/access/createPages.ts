import type { Access } from 'payload'
import { getUserTenantIDs } from '../../../utilities/getUserTenantIDs'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { User } from 'payload-types'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { ROLES } from '@/collections/UserRoles/roles.enum'

export const createPages: Access<User> = async ({ req }) => {
  if (!req.user) {
    return false
  }

  const selectedTenant = getSelectedTenantId(req) || (await getSelectedTenantToken())
  const adminTenantAccessIDs = getUserTenantIDs(req.user, ROLES.ADMIN)
  const editorTenantAccessIDs = getUserTenantIDs(req.user, ROLES.EDITOR)
  const tenantAdmin = adminTenantAccessIDs.some((id) => id === selectedTenant)

  if (isSuperAdmin(req) || tenantAdmin || editorTenantAccessIDs) {
    return true
  }

  if (adminTenantAccessIDs.length) {
    return true
  }

  return false
}
