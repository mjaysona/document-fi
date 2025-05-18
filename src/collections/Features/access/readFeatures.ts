import type { Access, Where } from 'payload'
import { isSuperAdmin as checkIfSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { isTenantAdmin as checkIfTenantAdmin } from '@/collections/utilities/access/isTenantAdmin'

export const readFeatures: Access = async (args) => {
  const req = args.req
  const isSuperAdmin = checkIfSuperAdmin(req)
  const isTenantAdmin = await checkIfTenantAdmin(req)

  if (isTenantAdmin) {
    return {
      and: [
        {
          isEnabled: {
            equals: true,
          },
        },
        {
          type: {
            equals: 'tenant',
          },
        },
      ],
    } as Where
  }

  if (isSuperAdmin) return true

  return false
}
