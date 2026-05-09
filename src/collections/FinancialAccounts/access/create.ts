import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createFinancialAccounts: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'financial-accounts', AccessType.CREATE)

export default createFinancialAccounts
