import type { Access } from 'payload'
import { DashboardCustomization } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createDashboardCustomization: Access<DashboardCustomization> = async (args) =>
  await getGenericRoleBasedAccess(args, 'dashboard-customization', AccessType.CREATE)

export default createDashboardCustomization
