import type { Access } from 'payload'
import { TenantRole } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const updateTenantRoles: Access<TenantRole> = async (args) =>
  await getGenericRoleBasedAccess(args, 'tenant-roles', AccessType.UPDATE)

export default updateTenantRoles
