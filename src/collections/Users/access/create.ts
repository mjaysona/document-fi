import type { Access } from 'payload'
import { User } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'
import { isTenantPlatformSelected } from '@/fields/utilities/access/isTenantPlatformSelected'

const createUsers: Access<User> = async (args) => {
  return (
    (await getGenericRoleBasedAccess(args, 'users', AccessType.CREATE)) &&
    (await !isTenantPlatformSelected(args.req))
  )
}

export default createUsers
