import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const updateUserRoles: Access<UserRole> = async (args) =>
  await getGenericRoleBasedAccess(args, 'user-roles', AccessType.UPDATE)

export default updateUserRoles
