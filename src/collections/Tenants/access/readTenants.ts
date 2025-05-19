import { isMemberOfLoggedTenant } from '@/collections/utilities/access/isMemberOfLoggedTenant'
import { hasSuperAdminRole } from '@/utilities/getRole'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import type { Access } from 'payload'

const readTenants: Access = async (args) => {
  const { req } = args
  const { user } = req

  const selectedTenantId = getSelectedTenantId(req) || (await getSelectedTenantToken()) || ''
  const isMember = isMemberOfLoggedTenant(user, selectedTenantId) || hasSuperAdminRole(user?.roles)

  return isMember
}

export default readTenants
