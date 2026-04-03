import type { Access, Where } from 'payload'
import {
  hasCreatePermission,
  hasDeletePermission,
  hasReadPermission,
  hasUpdatePermission,
} from '@/utilities/getRolePermissions'

const readWeightBills: Access = async (args) => {
  const { req } = args
  const { user } = req

  if (!user)
    return {
      allowPublicRead: {
        equals: true,
      },
    } as Where

  const canCreate = hasCreatePermission(user, 'weight-bills')
  const canRead = hasReadPermission(user, 'weight-bills')
  const canUpdate = hasUpdatePermission(user, 'weight-bills')
  const canDelete = hasDeletePermission(user, 'weight-bills')

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

export default readWeightBills
