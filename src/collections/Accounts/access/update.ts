import type { Access } from 'payload'
import { Account, Session } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const updateAccounts: Access<Account> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'accounts', AccessType.UPDATE)

export default updateAccounts
