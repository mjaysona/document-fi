import type { Access } from 'payload'
import { TenantRole } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const updateUserRoles: Access<TenantRole> = async (args) =>
  await getGenericRoleBasedAccess(args, 'user-roles', AccessType.UPDATE)

export default updateUserRoles
