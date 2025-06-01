import type { Access, Where } from 'payload'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
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
      or: [
        {
          _status: {
            equals: 'published',
          },
        },
        {
          createdBy: {
            equals: user.id,
          },
        },
      ],
    } as Where
  }

  return {
    createdBy: {
      equals: user.id,
    },
  }
}

export default readPosts
