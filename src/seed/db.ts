import { Payload } from 'payload'
import { user } from './user'
import { userRoles } from './userRoles'
import { assignUserRoles } from '../collections/utilities/assignUserRoles'
import { financialAccounts } from './financialAccounts'

export const initialData = async (payload: Payload) => {
  const users = await payload.count({
    collection: 'users',
  })

  if (users?.totalDocs > 0) return

  await user(payload)
  await userRoles(payload)
  await assignUserRoles(payload)
  await financialAccounts(payload)
}
