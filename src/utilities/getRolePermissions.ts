import { AccessType } from '@/enums'
import { Tenant } from 'node_modules/@payloadcms/plugin-multi-tenant/dist/types'
import { TenantRole, User } from 'payload-types'
import { hasSuperAdminRole } from './getRole'

const hasPermission = (
  user: User,
  selectedTenantId: string | undefined,
  collectionSlug: string,
  permission: AccessType,
  isAccessingViaSubdomain: boolean = false,
): boolean => {
  const selectedTenant = user.tenants?.find(
    (tenant) => (tenant.tenant as Tenant)?.id === selectedTenantId,
  )

  const userRoles = user.userRoles || []
  const selectedTenantRoles = selectedTenant?.roles
  const isSuperAdmin = hasSuperAdminRole(userRoles)

  if (!isAccessingViaSubdomain && !selectedTenantId && isSuperAdmin) return true

  // First check if permission exists in tenant roles
  const hasTenantPermission = selectedTenantRoles?.some((role) => {
    const collectionAccess = (role as TenantRole).permissions?.find(
      (permission: { collectionSlug: string }) => permission.collectionSlug === collectionSlug,
    )

    if (collectionAccess?.access.includes(permission)) return true

    const collectionGroupAccess = (role as TenantRole).groupedPermissions?.find(
      (permission: { group: string; collections: string[] }) =>
        permission.group === collectionSlug || permission.collections?.includes(collectionSlug),
    )

    return collectionGroupAccess?.access.includes(permission)
  })

  // If tenant permission exists, use it
  if (hasTenantPermission) return true

  // If no tenant permission, check user roles
  const hasUserRolePermission = userRoles.some((role) => {
    const collectionAccess = (role as TenantRole).permissions?.find(
      (permission: { collectionSlug: string }) => permission.collectionSlug === collectionSlug,
    )

    if (collectionAccess?.access.includes(permission)) return true

    const collectionGroupAccess = (role as TenantRole).groupedPermissions?.find(
      (permission: { group: string; collections: string[] }) =>
        permission.group === collectionSlug || permission.collections?.includes(collectionSlug),
    )

    return collectionGroupAccess?.access.includes(permission)
  })

  // Return true if either user role permission or super admin
  return Boolean(hasUserRolePermission || isSuperAdmin)
}

export const hasCreatePermission = (
  user: User,
  selectedTenantId: string | undefined,
  collectionSlug: string,
  isAccessingViaSubdomain: boolean = false,
): boolean => {
  return hasPermission(
    user,
    selectedTenantId,
    collectionSlug,
    AccessType.CREATE,
    isAccessingViaSubdomain,
  )
}

export const hasReadPermission = (
  user: User,
  selectedTenantId: string | undefined,
  collectionSlug: string,
  isAccessingViaSubdomain: boolean = false,
): boolean => {
  return hasPermission(
    user,
    selectedTenantId,
    collectionSlug,
    AccessType.READ,
    isAccessingViaSubdomain,
  )
}

export const hasUpdatePermission = (
  user: User,
  selectedTenantId: string | undefined,
  collectionSlug: string,
  isAccessingViaSubdomain: boolean = false,
): boolean => {
  return hasPermission(
    user,
    selectedTenantId,
    collectionSlug,
    AccessType.UPDATE,
    isAccessingViaSubdomain,
  )
}

export const hasDeletePermission = (
  user: User,
  selectedTenantId: string | undefined,
  collectionSlug: string,
  isAccessingViaSubdomain: boolean = false,
): boolean => {
  return hasPermission(
    user,
    selectedTenantId,
    collectionSlug,
    AccessType.DELETE,
    isAccessingViaSubdomain,
  )
}
