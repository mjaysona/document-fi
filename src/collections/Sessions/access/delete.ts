import type { Access } from 'payload'
import { Session } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteSessions: Access<Session> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'sessions', AccessType.DELETE)

export default deleteSessions
