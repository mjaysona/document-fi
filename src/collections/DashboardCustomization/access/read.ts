import type { Access } from 'payload'
import { DashboardCustomization } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const readDashboardCustomization: Access<DashboardCustomization> = async (args) =>
  await getGenericRoleBasedAccess(args, 'dashboard-customization', AccessType.READ)

export default readDashboardCustomization
