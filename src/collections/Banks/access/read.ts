import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const readBanks: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'banks', AccessType.READ)

export default readBanks
