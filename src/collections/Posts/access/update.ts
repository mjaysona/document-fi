import type { Access } from 'payload'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { isAccessingViaSubdomain } from '@/collections/utilities/access/isAccessingViaSubdomain'
import { hasUpdatePermission } from '@/utilities/getRolePermissions'

const updatePosts: Access = async (args) => {
  const { req } = args
  const { user, data } = req

  if (!user) return false

  const isCreatedByActiveUser = user.id === data?.createdBy
  const superAdmin = isSuperAdmin(req)
  const selectedTenant = getSelectedTenantId(req) || (await getSelectedTenantToken())
  const canUpdate = hasUpdatePermission(user, selectedTenant, 'posts')

  if (!selectedTenant) return false

  if (superAdmin || ((await isAccessingViaSubdomain(req)) && canUpdate) || isCreatedByActiveUser) {
    return true
  }

  return false
}

export default updatePosts
