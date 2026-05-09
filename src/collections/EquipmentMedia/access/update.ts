import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const updateEquipmentMedia: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'equipment-media', AccessType.UPDATE)

export default updateEquipmentMedia
