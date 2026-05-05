import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createQuotes: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'quotes', AccessType.CREATE)

export default createQuotes
