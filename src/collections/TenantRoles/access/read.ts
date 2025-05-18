import type { Access } from 'payload'
import { TenantRole } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'

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
  return (
    (await getGenericRoleBasedAccess(args, 'tenant-roles', AccessType.READ)) ||
    (await readOwnRoles(args))
  )
}

export default readTenantRoles
