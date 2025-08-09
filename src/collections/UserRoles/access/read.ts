import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'
import { UserRole } from '@payload-types'

const readOwnRoles: Access<UserRole> = async (args) => {
  const { req } = args
  const { user } = req

  const activeUserUserRoles = user?.userRoles
  const activeUserUserRolesIds = activeUserUserRoles?.map((role) =>
    typeof role === 'string' ? role : role.id,
  )

  return {
    id: {
      in: activeUserUserRolesIds,
    },
  }
}

const readUserRoles: Access<UserRole> = async (args) => {
  return (
    (await getGenericRoleBasedAccess(args, 'user-roles', AccessType.READ)) ||
    (await readOwnRoles(args))
  )
}

export default readUserRoles
