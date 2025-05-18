import type { Access } from 'payload'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { isAccessingViaSubdomain } from '@/collections/utilities/access/isAccessingViaSubdomain'
import { hasDeletePermission } from '@/utilities/getRolePermissions'

const deletePages: Access = async (args) => {
  const { req } = args
  const { user, data } = req

  if (!user) return false

  const isCreatedByActiveUser = user.id === data?.createdBy
  const superAdmin = isSuperAdmin(req)
  const selectedTenant = getSelectedTenantId(req) || (await getSelectedTenantToken())
  const canDelete = hasDeletePermission(user, selectedTenant, 'pages')

  if (superAdmin) return true

  if (!selectedTenant) return false

  if (((await isAccessingViaSubdomain(req)) && canDelete) || isCreatedByActiveUser) {
    return true
  }

  return false
}

export default deletePages
