import type { Access } from 'payload'
import { Media } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const updateMedia: Access<Media> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'media', AccessType.UPDATE)

export default updateMedia
