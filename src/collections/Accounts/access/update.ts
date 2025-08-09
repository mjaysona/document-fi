import type { Access } from 'payload'
import { Account, Session } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const updateAccounts: Access<Account> = async (args) =>
  await getGenericRoleBasedAccess(args, 'accounts', AccessType.UPDATE)

export default updateAccounts
