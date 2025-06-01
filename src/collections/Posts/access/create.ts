import type { Access } from 'payload'
import { Post } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const createPosts: Access<Post> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'posts', AccessType.CREATE)

export default createPosts
