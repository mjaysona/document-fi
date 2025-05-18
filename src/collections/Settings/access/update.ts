import type { Access } from 'payload'
import { Setting } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const updateSettings: Access<Setting> = async (args) =>
  await getGenericRoleBasedAccess(args, 'settings', AccessType.UPDATE)

export default updateSettings
