import type { Access } from 'payload'
import { DashboardCustomization } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const updateDashboardCustomization: Access<DashboardCustomization> = async (args) =>
  await getGenericRoleBasedAccess(args, 'dashboard-customization', AccessType.UPDATE)

export default updateDashboardCustomization
