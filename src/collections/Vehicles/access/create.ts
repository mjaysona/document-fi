import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createVehicles: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'vehicles', AccessType.CREATE)

export default createVehicles
