import { ROLES } from '@/collections/UserRoles/roles.enum'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'
import { User } from 'payload-types'

export const isTenantAdmin = (user: User | null, tenantId: string): boolean => {
  const adminTenantAccessIDs = getUserTenantIDs(user, ROLES.ADMIN)
  return adminTenantAccessIDs.some((id) => id === tenantId)
}
