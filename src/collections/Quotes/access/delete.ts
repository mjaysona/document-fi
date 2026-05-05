import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteQuotes: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'quotes', AccessType.DELETE)

export default deleteQuotes
