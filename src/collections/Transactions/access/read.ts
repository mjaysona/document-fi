import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const readTransactions: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'transactions', AccessType.READ)

export default readTransactions
