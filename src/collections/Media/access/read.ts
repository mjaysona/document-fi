import type { Access } from 'payload'
import { Media } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const readMedia: Access<Media> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'media', AccessType.READ)

export default readMedia
