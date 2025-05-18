import type { Access, Where } from 'payload'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { isAccessingViaSubdomain } from '@/collections/utilities/access/isAccessingViaSubdomain'
import { isTenantAdmin } from '@/collections/utilities/access/isTenantAdmin'

export const readPages: Access = async (args) => {
  const req = args.req
  const { user } = req

  if (!user) return false

  const superAdmin = isSuperAdmin(req)
  const selectedTenant = getSelectedTenantId(req) || (await getSelectedTenantToken())

  if (selectedTenant) {
    if (!(await isAccessingViaSubdomain(req))) {
      return false
    }

    const tenantAdmin = isTenantAdmin(req.user, selectedTenant)

    if (superAdmin || tenantAdmin) {
      return true
    }

    return {
      _status: {
        equals: 'published',
      },
    } as Where
  }

  return false
}
