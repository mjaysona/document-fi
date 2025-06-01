import type { Access, Where } from 'payload'
import { TenantRole } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteTenantRoles: Access<TenantRole> = async (args) => {
  if (await getGenericTenantRoleBasedAccess(args, 'tenant-roles', AccessType.DELETE)) {
    return {
      isSystemRole: {
        not_equals: true,
      },
    } as Where
  }

  return false
}

export default deleteTenantRoles
