import type { Access } from 'payload'
import { TenantRole } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const createTenantRoles: Access<TenantRole> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'tenant-roles', AccessType.CREATE)

export default createTenantRoles
