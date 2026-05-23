import type { Access, CollectionSlug } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'
import { hasSuperAdminRole } from '@/utilities/getRole'

const userConfigurationsSlug = 'user-configurations' as CollectionSlug

const readUserConfigurations: Access<Record<string, unknown>> = async (args) => {
  const hasReadAccess = await getGenericRoleBasedAccess(
    args,
    userConfigurationsSlug,
    AccessType.READ,
  )

  if (!hasReadAccess) return false

  const user = args.req.user
  if (!user) return false

  if (hasSuperAdminRole(user.userRoles) || Boolean(user.isFirstSystemUser)) return true

  return {
    user: {
      equals: user.id,
    },
  }
}

export default readUserConfigurations
