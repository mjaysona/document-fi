import type { Access } from 'payload'
import { Page } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createPages: Access<Page> = async (args) =>
  await getGenericRoleBasedAccess(args, 'pages', AccessType.CREATE)

export default createPages
