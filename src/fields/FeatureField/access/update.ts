import type { FieldAccess, PayloadRequest } from 'payload'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { getTenantAccessIDs } from '@/utilities/getTenantAccessIDs'

export const tenantFieldUpdate = (req: PayloadRequest) => {
  const tenantIDs = getTenantAccessIDs(req.user)
  return Boolean(isSuperAdmin(req) || tenantIDs.length > 0)
}
