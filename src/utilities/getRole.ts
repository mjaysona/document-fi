import { User } from 'payload-types'
import { checkUserRoles } from './checkUserRoles'
import { ROLES } from '@/collections/UserRoles/roles.enum'

export const hasAdminRole = (userRoles: User['userRoles']): boolean =>
  checkUserRoles([ROLES.ADMIN], userRoles)
export const hasSuperAdminRole = (userRoles: User['userRoles'] | undefined): boolean =>
  checkUserRoles([ROLES.SUPER_ADMIN], userRoles)
