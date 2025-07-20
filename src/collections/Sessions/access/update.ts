import type { Access } from 'payload'
import { Session } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const updateSessions: Access<Session> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'sessions', AccessType.UPDATE)

export default updateSessions
