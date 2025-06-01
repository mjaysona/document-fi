import type { Access } from 'payload'
import { TenantMedia, TenantRole } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const createTenantMedia: Access<TenantMedia> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'tenant-media', AccessType.CREATE)

export default createTenantMedia
