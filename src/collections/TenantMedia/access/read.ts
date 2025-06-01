import type { Access } from 'payload'
import { TenantMedia } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const readTenantMedia: Access<TenantMedia> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'tenant-media', AccessType.READ)

export default readTenantMedia
