import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createWeightBills: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'weight-bills', AccessType.CREATE)

export default createWeightBills
