import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteBanks: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'banks', AccessType.DELETE)

export default deleteBanks
