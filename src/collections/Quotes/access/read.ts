import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const readQuotes: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'quotes', AccessType.READ)

export default readQuotes
