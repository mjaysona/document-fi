import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteWeightBillReceipts: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'weight-bill-receipts', AccessType.DELETE)

export default deleteWeightBillReceipts
