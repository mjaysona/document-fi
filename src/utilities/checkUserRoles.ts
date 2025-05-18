import { Role, User } from 'payload-types'

export const checkUserRoles = (
  rolesToCheck: User['roles'] = [],
  userRoles: User['roles'] = [],
): boolean => {
  if (
    rolesToCheck?.some((role) => {
      return userRoles?.some((individualRole) => {
        return typeof individualRole !== 'string' && individualRole.label === role
      })
    })
  ) {
    return true
  }

  return false
}
