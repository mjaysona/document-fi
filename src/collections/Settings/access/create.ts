import type { Access } from 'payload'
import { Setting } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const createSettings: Access<Setting> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'settings', AccessType.CREATE)

export default createSettings
