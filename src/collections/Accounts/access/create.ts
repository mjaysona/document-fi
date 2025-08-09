import type { Access } from 'payload'
import { Account } from 'payload-types'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const createAccounts: Access<Account> = async (args) =>
  await getGenericRoleBasedAccess(args, 'accounts', AccessType.CREATE)

export default createAccounts
