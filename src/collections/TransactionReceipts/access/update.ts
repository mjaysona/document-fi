import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const updateTransactionReceipts: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'transaction-receipts', AccessType.UPDATE)

export default updateTransactionReceipts
