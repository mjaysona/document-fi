import type { Access } from 'payload'
import { Page } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const createPages: Access<Page> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'pages', AccessType.CREATE)

export default createPages
