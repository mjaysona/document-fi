import type { Access } from 'payload'
import { Setting } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const updateSettings: Access<Setting> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'settings', AccessType.UPDATE)

export default updateSettings
