import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const updateSessionUploads: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'session-uploads', AccessType.UPDATE)

export default updateSessionUploads
