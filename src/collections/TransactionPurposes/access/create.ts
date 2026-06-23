import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createTransactionPurposes: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'transaction-purposes', AccessType.CREATE)

export default createTransactionPurposes
