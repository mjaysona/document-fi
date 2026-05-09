import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteTransactionReceipts: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'transaction-receipts', AccessType.DELETE)

export default deleteTransactionReceipts
