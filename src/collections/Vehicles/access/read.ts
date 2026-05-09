import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const readVehicles: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'vehicles', AccessType.READ)

export default readVehicles
