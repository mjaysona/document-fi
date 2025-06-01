import type { Access } from 'payload'
import { TenantRole } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { hasMultiTenancyFeature } from '../../utilities/hasMultitenancyFeature'

const readOwnRoles: Access<TenantRole> = async (args) => {
  const { req } = args
  const { user } = req

  const activeTenantId = getSelectedTenantId(req) || (await getSelectedTenantToken())
  const activeUserTenantRoles = user?.tenants?.find(
    (tenant) => typeof tenant.tenant === 'object' && tenant.tenant.id === activeTenantId,
  )?.roles
  const activeUserTenantRolesIds = activeUserTenantRoles?.map((role) =>
    typeof role === 'string' ? role : role.id,
  )

  return {
    id: {
      in: activeUserTenantRolesIds,
    },
  }
}

const readTenantRoles: Access<TenantRole> = async (args) => {
  const { req } = args
  const hasMultiTenantFeature = await hasMultiTenancyFeature(req)

  if (hasMultiTenantFeature) {
    const hasReadAccess = await getGenericTenantRoleBasedAccess(
      args,
      'tenant-roles',
      AccessType.READ,
    )
    const canReadOwnRoles = await readOwnRoles(args)

    return hasReadAccess || canReadOwnRoles
  }

  return hasMultiTenantFeature
}

export default readTenantRoles
