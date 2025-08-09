import { AccessType } from '@/enums'
import { User, UserRole } from 'payload-types'
import { hasSuperAdminRole } from './getRole'

const hasPermission = (user: User, collectionSlug: string, permission: AccessType): boolean => {
  const userRoles = user.userRoles || []
  const isSuperAdmin = hasSuperAdminRole(userRoles)

  if (isSuperAdmin) return true

  const hasUserRolePermission = userRoles.some((role) => {
    const collectionAccess = (role as UserRole).permissions?.find(
      (permission: { collectionSlug: string }) => permission.collectionSlug === collectionSlug,
    )

    if (collectionAccess?.access.includes(permission)) return true

    const collectionGroupAccess = (role as UserRole).groupedPermissions?.find(
      (permission: { group: string; collections: string[] }) =>
        permission.group === collectionSlug || permission.collections?.includes(collectionSlug),
    )

    return collectionGroupAccess?.access.includes(permission)
  })

  return Boolean(hasUserRolePermission)
}

export const hasCreatePermission = (user: User, collectionSlug: string): boolean => {
  return hasPermission(user, collectionSlug, AccessType.CREATE)
}

export const hasReadPermission = (user: User, collectionSlug: string): boolean => {
  return hasPermission(user, collectionSlug, AccessType.READ)
}

export const hasUpdatePermission = (user: User, collectionSlug: string): boolean => {
  return hasPermission(user, collectionSlug, AccessType.UPDATE)
}

export const hasDeletePermission = (user: User, collectionSlug: string): boolean => {
  return hasPermission(user, collectionSlug, AccessType.DELETE)
}
