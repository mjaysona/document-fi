import type { Access } from 'payload'
import { Setting } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteSettings: Access<Setting> = async (args) =>
  await getGenericRoleBasedAccess(args, 'settings', AccessType.DELETE)

export default deleteSettings
