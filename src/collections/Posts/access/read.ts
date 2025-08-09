import type { Access, Where } from 'payload'
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

  const canCreate = hasCreatePermission(user, 'posts')
  const canRead = hasReadPermission(user, 'posts')
  const canUpdate = hasUpdatePermission(user, 'posts')
  const canDelete = hasDeletePermission(user, 'posts')

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
