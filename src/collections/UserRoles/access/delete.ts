import type { Access, Where } from 'payload'
import { TenantRole } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteUserRoles: Access<TenantRole> = async (args) => {
  if (await getGenericTenantRoleBasedAccess(args, 'user-roles', AccessType.DELETE)) {
    return {
      isSystemRole: {
        not_equals: true,
      },
    } as Where
  }

  return false
}

export default deleteUserRoles
