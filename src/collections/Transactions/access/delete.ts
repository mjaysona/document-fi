import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteTransactions: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'transactions', AccessType.DELETE)

export default deleteTransactions
