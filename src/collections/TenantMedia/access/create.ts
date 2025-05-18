import type { Access } from 'payload'
import { TenantMedia, TenantRole } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createTenantMedia: Access<TenantMedia> = async (args) =>
  await getGenericRoleBasedAccess(args, 'tenant-media', AccessType.CREATE)

export default createTenantMedia
