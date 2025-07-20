import type { Access } from 'payload'
import { Account } from 'payload-types'
import getGenericTenantRoleBasedAccess from '@/collections/utilities/access/getGenericTenantRoleBasedAccess'
import { AccessType } from '@/enums'

const readAccounts: Access<Account> = async (args) =>
  await getGenericTenantRoleBasedAccess(args, 'accounts', AccessType.READ)

export default readAccounts
