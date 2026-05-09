import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createBanks: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'banks', AccessType.CREATE)

export default createBanks
