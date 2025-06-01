import type { Access } from 'payload'
import { TenantRole } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const updateUserRoles: Access<TenantRole> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'user-roles', AccessType.UPDATE)

export default updateUserRoles
