import { User } from 'payload-types'

export const isMemberOfLoggedTenant = (user: User | null, loggedTenantId: string): boolean => {
  if (!user) return false

  const { tenants } = user

  if (tenants) {
    return tenants.some(({ tenant }) => {
      return tenant === loggedTenantId
    })
  }

  return false
}
