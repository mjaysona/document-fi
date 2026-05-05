import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const updateQuotes: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'quotes', AccessType.UPDATE)

export default updateQuotes
