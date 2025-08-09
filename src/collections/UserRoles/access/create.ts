import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'
import { UserRole } from '~/payload-types'

const createUserRoles: Access<UserRole> = async (args) =>
  await getGenericRoleBasedAccess(args, 'user-roles', AccessType.CREATE)

export default createUserRoles
