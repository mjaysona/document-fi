import type { Access } from 'payload'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { hasUpdatePermission } from '@/utilities/getRolePermissions'

const updatePages: Access = async (args) => {
  const { req } = args
  const { user, data } = req

  if (!user) return false

  const isCreatedByActiveUser = user.id === data?.createdBy
  const selectedTenant = getSelectedTenantId(req) || (await getSelectedTenantToken())
  const canUpdate = hasUpdatePermission(user, selectedTenant, 'pages')

  if (!selectedTenant) return false

  if (canUpdate || isCreatedByActiveUser) {
    return true
  }

  return false
}

export default updatePages
