import { UserRole } from '~/payload-types'

/**
 * Checks if any app role grants read (or all) access to a collection.
 * @param userRoles The user's roles (array of UserRole or string IDs)
 * @param collectionSlug The collection slug to check access for
 */
export function hasAppRoleReadAccess(userRoles: (UserRole | string)[] | null | undefined, collectionSlug: string): boolean {
  if (!userRoles) return false
  return userRoles
    .map((r) => (typeof r !== 'string' ? (r as UserRole) : null))
    .filter((role): role is UserRole => !!role && role.roleType === 'app')
    .some((role) =>
      (role.permissions || []).some(
        (perm) =>
          perm.collectionSlug === collectionSlug &&
          (perm.access.includes('read') || perm.access.includes('all')),
      ),
    )
}