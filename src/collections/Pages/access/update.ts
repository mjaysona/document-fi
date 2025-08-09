import type { Access } from 'payload'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { hasUpdatePermission } from '@/utilities/getRolePermissions'
import { hasSuperAdminRole } from '@/utilities/getRole'

const updatePages: Access = async (args) => {
  const { req } = args
  const { user, data } = req

  if (!user) return false

  const isSuperAdmin = hasSuperAdminRole(user?.userRoles)
  const isCreatedByActiveUser = user.id === data?.createdBy

  return isSuperAdmin || isCreatedByActiveUser
}

export default updatePages
