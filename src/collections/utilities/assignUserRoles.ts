import { Payload } from 'payload'
import { ROLES } from '../UserRoles/roles.enum'
import { UserRole } from '@payload-types'

/*
 * Assigns the "Super Admin" role to the "Super Admin" user.
 */
export const assignUserRoles = async (payload: Payload): Promise<void> => {
  const superAdminUser = await payload.find({
    collection: 'users',
    where: {
      email: {
        equals: 'super@payloadcms.com',
      },
    },
  })
  const superAdminRoles = await payload.find({
    collection: 'user-roles',
    where: {
      label: {
        equals: ROLES.SUPER_ADMIN,
      },
    },
  })

  if (!superAdminUser?.docs?.length || !superAdminRoles?.docs?.length) {
    console.error('"Super Admin" user or role not found, cannot assign role.')
    return
  }

  const userRoles = (superAdminUser.docs[0].userRoles as UserRole[]) || []
  const hasSuperAdminRole = userRoles.some((role) => role.label === ROLES.SUPER_ADMIN)

  if (hasSuperAdminRole) {
    console.info(
      `User "${superAdminUser.docs[0].email}" already has the "Super Admin" role assigned.`,
    )
    return
  }

  const userEmail = superAdminUser.docs[0].email
  const roleLabel = superAdminRoles.docs[0].label
  const userRole = String(superAdminRoles.docs[0].id)

  try {
    await payload.update({
      collection: 'users',
      id: superAdminUser.docs[0].id,
      data: {
        userRoles: [userRole],
      },
      overrideAccess: true,
    })
    console.info(`Role "${roleLabel}" assigned to user "${userEmail}" successfully.`)
  } catch (error) {
    console.error(`Error assigning role "${roleLabel}" to user "${userEmail}":`, error)
  }
}
