import type { Access } from 'payload'
import { hasDeletePermission } from '@/utilities/getRolePermissions'
import { hasSuperAdminRole } from '~/src/utilities/getRole'

const deletePosts: Access = async (args) => {
  const { req } = args
  const { user, data } = req

  if (!user) return false

  const isCreatedByActiveUser = user.id === data?.createdBy
  const isSuperAdmin = hasSuperAdminRole(req?.user?.userRoles)
  const canDelete = hasDeletePermission(user, 'posts')

  return isSuperAdmin || canDelete || isCreatedByActiveUser
}

export default deletePosts
