import type { Access } from 'payload'
import { User } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'
import { hasSuperAdminRole } from '@/utilities/getRole'

const createUsers: Access<User> = async (args) => {
  const hasPermission = await getGenericRoleBasedAccess(args, 'users', AccessType.CREATE)
  const isSuperAdmin = hasSuperAdminRole(args.req.user?.userRoles)

  return hasPermission || isSuperAdmin
}

export default createUsers
