import type { Access } from 'payload'
import { Session } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createSessions: Access<Session> = async (args) =>
  await getGenericRoleBasedAccess(args, 'sessions', AccessType.CREATE)

export default createSessions
