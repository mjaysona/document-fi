import type { Access } from 'payload'

import { getUserTenantIDs } from '../../../utilities/getUserTenantIDs'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { getSelectedTenantId } from '@/utilities/getSelectedTenant'
import { ROLES } from '@/collections/Roles/roles.enum'

export const updateAndDeletePages: Access = ({ req, data }) => {
  const { user } = req

  if (!user) {
    return false
  }
  const isCreatedByActiveUser = user.id === data?.createdBy
  const adminTenantAccessIDs = getUserTenantIDs(req.user, ROLES.ADMIN)
  const selectedTenant = getSelectedTenantId(req)
  const isTenantAdmin = adminTenantAccessIDs.some((id) => id === selectedTenant)

  if (isSuperAdmin(req) || isTenantAdmin || isCreatedByActiveUser) {
    return true
  }

  /**
   * Constrains update and delete access to users that belong
   * to the same tenant as the tenant-admin making the request
   *
   * You may want to take this a step further with a beforeChange
   * hook to ensure that the a tenant-admin can only remove users
   * from their own tenant in the tenants array.
   */
  return {
    'tenants.tenant': {
      in: getUserTenantIDs(user, ROLES.ADMIN),
    },
  }
}
