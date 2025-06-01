import { isMemberOfLoggedTenant } from '@/collections/utilities/access/isMemberOfLoggedTenant'
import { hasSuperAdminRole } from '@/utilities/getRole'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import type { Access } from 'payload'
import { hasMultiTenancyFeature } from '../../utilities/hasMultitenancyFeature'

const readTenants: Access = async (args) => {
  const { req } = args
  const { user } = req
  const hasMultiTenantFeature = await hasMultiTenancyFeature(req)
  const selectedTenantId = getSelectedTenantId(req) || (await getSelectedTenantToken()) || ''
  const isMember = isMemberOfLoggedTenant(user, selectedTenantId)

  return (isMember || hasSuperAdminRole(user?.userRoles)) && hasMultiTenantFeature
}

export default readTenants
