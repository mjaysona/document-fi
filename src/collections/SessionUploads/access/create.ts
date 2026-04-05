import type { Access } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createSessionUploads: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, 'session-uploads', AccessType.CREATE)

export default createSessionUploads
