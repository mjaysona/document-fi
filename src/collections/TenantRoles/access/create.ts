import type { Access } from 'payload'
import { TenantRole } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createTenantRoles: Access<TenantRole> = async (args) =>
  await getGenericRoleBasedAccess(args, 'tenant-roles', AccessType.CREATE)

export default createTenantRoles
