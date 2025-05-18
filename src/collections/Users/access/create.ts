import type { Access } from 'payload'
import { User } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createUsers: Access<User> = async (args) =>
  await getGenericRoleBasedAccess(args, 'users', AccessType.CREATE)

export default createUsers
