import type { Access } from 'payload'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { isAccessingViaSubdomain } from '@/collections/utilities/access/isAccessingViaSubdomain'
import { hasUpdatePermission } from '@/utilities/getRolePermissions'
import { hasSuperAdminRole } from '~/src/utilities/getRole'

const updatePosts: Access = async (args) => {
  const { req } = args
  const { user, data } = req

  if (!user) return false

  const isCreatedByActiveUser = user.id === data?.createdBy
  const isSuperAdmin = hasSuperAdminRole(req?.user?.userRoles)
  const selectedTenant = getSelectedTenantId(req) || (await getSelectedTenantToken())
  const canUpdate = hasUpdatePermission(user, selectedTenant, 'posts')

  if (
    isSuperAdmin ||
    ((await isAccessingViaSubdomain(req)) && canUpdate) ||
    isCreatedByActiveUser
  ) {
    return true
  }

  return false
}

export default updatePosts
