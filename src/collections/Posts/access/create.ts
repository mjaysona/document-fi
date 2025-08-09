import type { Access } from 'payload'
import { Post } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createPosts: Access<Post> = async (args) =>
  await getGenericRoleBasedAccess(args, 'posts', AccessType.CREATE)

export default createPosts
