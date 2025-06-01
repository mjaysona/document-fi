import type { Access } from 'payload'
import { User } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'
import { isTenantPlatformSelected } from '@/fields/utilities/access/isTenantPlatformSelected'

const createUsers: Access<User> = async (args) => {
  const hasAccessBasedOnRole = await getGenericTenantRoleBasedAccess(
    args,
    'users',
    AccessType.CREATE,
  )
  const isPlatformSelected = await isTenantPlatformSelected(args.req)

  return hasAccessBasedOnRole && !isPlatformSelected
}

export default createUsers
