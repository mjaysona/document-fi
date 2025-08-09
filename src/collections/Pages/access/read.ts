import type { Access, Where } from 'payload'
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

  const canCreate = hasCreatePermission(user, 'pages')
  const canRead = hasReadPermission(user, 'pages')
  const canUpdate = hasUpdatePermission(user, 'pages')
  const canDelete = hasDeletePermission(user, 'pages')

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
