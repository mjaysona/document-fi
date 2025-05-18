import type { Access } from 'payload'
import { TenantMedia } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteTenantMedia: Access<TenantMedia> = async (args) =>
  await getGenericRoleBasedAccess(args, 'tenant-media', AccessType.DELETE)

export default deleteTenantMedia
