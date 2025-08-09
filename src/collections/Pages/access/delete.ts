import type { Access } from 'payload'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { hasDeletePermission } from '@/utilities/getRolePermissions'

const deletePages: Access = async (args) => {
  const { req } = args
  const { user, data } = req

  if (!user) return false

  const superAdmin = isSuperAdmin(req)

  if (superAdmin) return true

  const isCreatedByActiveUser = user.id === data?.createdBy
  const canDelete = hasDeletePermission(user, 'pages')

  return canDelete || isCreatedByActiveUser
}

export default deletePages
