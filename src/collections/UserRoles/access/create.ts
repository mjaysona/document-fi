import type { Access } from 'payload'
import { TenantRole } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const createUserRoles: Access<TenantRole> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'user-roles', AccessType.CREATE)

export default createUserRoles
