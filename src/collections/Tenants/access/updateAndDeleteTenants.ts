import { hasSuperAdminRole } from '@/utilities/getRole'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'
import { Access, Where } from 'payload'

export const updateAndDeleteTenants: Access = ({ req, data }) => {
  if (!req.user) {
    return false
  }

  if (hasSuperAdminRole(req.user?.roles)) {
    return {
      slug: {
        not_equals: 'platform',
      },
    } as Where
  }

  return {
    and: [
      {
        slug: {
          not_equals: 'platform',
        },
      },
      {
        id: {
          in: getUserTenantIDs(req.user, 'tenant-admin'),
        },
      },
    ],
  } as Where
}
