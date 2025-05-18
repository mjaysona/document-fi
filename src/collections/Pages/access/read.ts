import type { Access, Where } from 'payload'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { isAccessingViaSubdomain } from '@/collections/utilities/access/isAccessingViaSubdomain'
import {
  hasCreatePermission,
  hasDeletePermission,
  hasReadPermission,
  hasUpdatePermission,
} from '@/utilities/getRolePermissions'

const readPages: Access = async (args) => {
  const { req } = args
  const { user } = req

  if (!user) {
    return {
      allowPublicRead: {
        equals: true,
      },
    } as Where
  }

  const selectedTenant = getSelectedTenantId(req) || (await getSelectedTenantToken())
  const subdomainAccess = await isAccessingViaSubdomain(req)
  const canCreate = hasCreatePermission(user, selectedTenant, 'pages', subdomainAccess)
  const canRead = hasReadPermission(user, selectedTenant, 'pages', subdomainAccess)
  const canUpdate = hasUpdatePermission(user, selectedTenant, 'pages', subdomainAccess)
  const canDelete = hasDeletePermission(user, selectedTenant, 'pages', subdomainAccess)

  if (canRead) {
    if (canCreate || canUpdate || canDelete) return true

    return {
      _status: {
        equals: 'published',
      },
    } as Where
  }

  return false
}

export default readPages
