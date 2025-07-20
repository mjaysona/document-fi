import type { Access } from 'payload'
import { Account } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const deleteAccounts: Access<Account> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'accounts', AccessType.DELETE)

export default deleteAccounts
