import { hasSuperAdminRole } from '@/utilities/getRole'
import type { PayloadRequest } from 'payload'

export const isSuperAdmin = (req: PayloadRequest) => {
  if (!req?.user) {
    return false
  }

  return Boolean(hasSuperAdminRole(req.user.roles))
}
