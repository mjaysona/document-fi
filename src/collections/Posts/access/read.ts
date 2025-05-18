import type { Access, Where } from 'payload'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { isAccessingViaSubdomain } from '@/collections/utilities/access/isAccessingViaSubdomain'
import {
  hasCreatePermission,
  hasDeletePermission,
  hasReadPermission,
  hasUpdatePermission,
} from '@/utilities/getRolePermissions'

const readPosts: Access = async (args) => {
  const { req } = args
  const { user } = req

  if (!user)
    return {
      allowPublicRead: {
        equals: true,
      },
    } as Where

  const selectedTenant = getSelectedTenantId(req) || (await getSelectedTenantToken())
  const canCreate = hasCreatePermission(user, selectedTenant, 'posts')
  const canRead = hasReadPermission(user, selectedTenant, 'posts')
  const canUpdate = hasUpdatePermission(user, selectedTenant, 'posts')
  const canDelete = hasDeletePermission(user, selectedTenant, 'posts')

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

export default readPosts
