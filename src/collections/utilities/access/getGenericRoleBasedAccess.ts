import { AccessArgs, AccessResult, CollectionSlug } from 'payload'
import {
  hasCreatePermission,
  hasDeletePermission,
  hasReadPermission,
  hasUpdatePermission,
} from '@/utilities/getRolePermissions'
import { AccessType } from '@/enums'

const getGenericRoleBasedAccess = async (
  args: AccessArgs,
  slug: CollectionSlug,
  permission: AccessType,
): Promise<AccessResult> => {
  const { req } = args
  const { user } = req

  if (!user) return false

  let hasPermission: boolean = false

  switch (permission) {
    case AccessType.CREATE:
      hasPermission = hasCreatePermission(user, slug)
      break
    case AccessType.READ:
      hasPermission = hasReadPermission(user, slug)
      break
    case AccessType.UPDATE:
      hasPermission = hasUpdatePermission(user, slug)
      break
    case AccessType.DELETE:
      hasPermission = hasDeletePermission(user, slug)
      break
    default:
      hasPermission = false
  }

  return hasPermission
}

export default getGenericRoleBasedAccess
