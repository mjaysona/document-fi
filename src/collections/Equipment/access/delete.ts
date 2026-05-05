import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteEquipment: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'equipment', AccessType.DELETE)

export default deleteEquipment
