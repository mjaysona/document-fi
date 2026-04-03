import type { Access } from 'payload'
import { hasUpdatePermission } from '@/utilities/getRolePermissions'
import { hasSuperAdminRole } from '~/src/utilities/getRole'

const updateWeightBills: Access = async (args) => {
  const { req } = args
  const { user, data } = req

  if (!user) return false

  const isCreatedByActiveUser = user.id === data?.createdBy
  const isSuperAdmin = hasSuperAdminRole(req?.user?.userRoles)
  const canUpdate = hasUpdatePermission(user, 'weight-bills')

  return isSuperAdmin || canUpdate || isCreatedByActiveUser
}

export default updateWeightBills
