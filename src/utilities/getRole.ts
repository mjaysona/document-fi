import { User } from 'payload-types'
import { checkUserRoles } from './checkUserRoles'
import { ROLES } from '@/collections/Roles/roles.enum'

export const hasAdminRole = (userRoles: User['roles']): boolean =>
  checkUserRoles([ROLES.ADMIN], userRoles)
export const hasSuperAdminRole = (userRoles: User['roles'] | undefined): boolean =>
  checkUserRoles([ROLES.SUPER_ADMIN], userRoles)
export const hasTenantAdminRole = (userRoles: User['roles']): boolean =>
  checkUserRoles([ROLES.ADMIN], userRoles)
