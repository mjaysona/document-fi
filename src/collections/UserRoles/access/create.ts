import type { Access } from 'payload'
import { TenantRole } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createUserRoles: Access<TenantRole> = async (args) =>
  await getGenericRoleBasedAccess(args, 'user-roles', AccessType.CREATE)

export default createUserRoles
