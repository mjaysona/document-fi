import type { Access } from 'payload'
import { Media } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const updateMedia: Access<Media> = async (args) =>
  await getGenericRoleBasedAccess(args, 'media', AccessType.UPDATE)

export default updateMedia
