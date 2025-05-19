import type { PayloadRequest } from 'payload'
import { getSelectedTenantId } from '@/utilities/getSelectedTenant'

export const isTenantPlatformSelected = async (req: PayloadRequest) => {
  if (!req?.user) {
    return false
  }

  const { payload } = req
  const selectedTenant = getSelectedTenantId(req)

  if (selectedTenant) {
    try {
      const fullSelectedTenant = await payload.findByID({
        collection: 'tenants',
        id: selectedTenant,
        depth: 0,
      })

      if (fullSelectedTenant?.slug === 'platform') return true
    } catch (e) {
      return false
    }
  }

  return false
}
