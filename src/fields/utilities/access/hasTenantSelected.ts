import type { PayloadRequest } from 'payload'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { getSelectedTenantId } from '@/utilities/getSelectedTenant'

export const hasTenantSelected = (req: PayloadRequest) => {
  if (!req?.user) {
    return false
  }

  const superAdmin = isSuperAdmin(req)
  const selectedTenant = getSelectedTenantId(req)

  if (superAdmin && selectedTenant) {
    return true
  }

  return false
}
