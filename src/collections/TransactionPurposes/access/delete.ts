import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteTransactionPurposes: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'transaction-purposes', AccessType.DELETE)

export default deleteTransactionPurposes
