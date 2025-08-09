import type { Access, Where } from 'payload'
import { TenantRole } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteUserRoles: Access<TenantRole> = async (args) => {
  if (await getGenericRoleBasedAccess(args, 'user-roles', AccessType.DELETE)) {
    return {
      isSystemRole: {
        not_equals: true,
      },
    } as Where
  }

  return false
}

export default deleteUserRoles
