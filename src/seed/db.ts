import { Payload } from 'payload'
import { user } from './user'
import { userRoles } from './userRoles'
import { assignUserRoles } from '../collections/utilities/assignUserRoles'
import { tenants } from './tenants'
import { tenantRoles } from './tenant-roles'
import { tenantUser } from './tenant-user'
import inquirer from 'inquirer'

export const initialData = async (payload: Payload) => {
  const users = await payload.count({
    collection: 'users',
  })

  if (users) return

  const { tenantMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'tenantMode',
      message: 'Select tenant mode:',
      choices: ['Single Tenant', 'Multi Tenant'],
    },
  ])

  const isMultiTenant = tenantMode === 'Multi Tenant'

  await user(payload)
  await userRoles(payload)
  await assignUserRoles(payload)

  if (isMultiTenant) {
    await tenants(payload)
    await tenantRoles(payload)
    await tenantUser(payload)
  }
}
