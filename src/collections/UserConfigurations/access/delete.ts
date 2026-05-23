import type { Access, CollectionSlug } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'
import { hasSuperAdminRole } from '@/utilities/getRole'

const userConfigurationsSlug = 'user-configurations' as CollectionSlug

const deleteUserConfigurations: Access<Record<string, unknown>> = async (args) => {
  const hasDeleteAccess = await getGenericRoleBasedAccess(
    args,
    userConfigurationsSlug,
    AccessType.DELETE,
  )

  if (!hasDeleteAccess) return false

  const user = args.req.user
  if (!user) return false

  if (hasSuperAdminRole(user.userRoles) || Boolean(user.isFirstSystemUser)) return true

  return {
    user: {
      equals: user.id,
    },
  }
}

export default deleteUserConfigurations
