import type { Access } from 'payload'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { isAccessingViaSubdomain } from '@/collections/utilities/access/isAccessingViaSubdomain'
import { hasDeletePermission } from '@/utilities/getRolePermissions'
import { hasSuperAdminRole } from '~/src/utilities/getRole'

const deletePosts: Access = async (args) => {
  const { req } = args
  const { user, data } = req

  if (!user) return false

  const isCreatedByActiveUser = user.id === data?.createdBy
  const isSuperAdmin = hasSuperAdminRole(req?.user?.userRoles)
  const selectedTenant = getSelectedTenantId(req) || (await getSelectedTenantToken())
  const canDelete = hasDeletePermission(user, selectedTenant, 'posts')

  if (!selectedTenant) return false

  if (
    isSuperAdmin ||
    ((await isAccessingViaSubdomain(req)) && canDelete) ||
    isCreatedByActiveUser
  ) {
    return true
  }

  return false
}

export default deletePosts
