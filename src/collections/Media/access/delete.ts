import type { Access } from 'payload'
import { Media } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteMedia: Access<Media> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'media', AccessType.DELETE)

export default deleteMedia
