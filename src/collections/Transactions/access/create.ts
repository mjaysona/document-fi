import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createTransactions: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'transactions', AccessType.CREATE)

export default createTransactions
