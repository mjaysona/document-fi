import { hasSuperAdminRole } from '@/utilities/getRole'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'
import { Access } from 'payload'

export const updateAndDeleteTenants: Access = ({ req }) => {
  if (!req.user) {
    return false
  }

  if (hasSuperAdminRole(req.user?.roles)) {
    return true
  }

  return {
    id: {
      in: getUserTenantIDs(req.user, 'tenant-admin'),
    },
  }
}
