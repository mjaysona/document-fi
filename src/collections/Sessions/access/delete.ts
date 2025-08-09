import type { Access } from 'payload'
import { Session } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteSessions: Access<Session> = async (args) =>
  await getGenericRoleBasedAccess(args, 'sessions', AccessType.DELETE)

export default deleteSessions
