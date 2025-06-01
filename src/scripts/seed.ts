import { getPayload } from 'payload'
import { user } from '../seed/user'
import config from '@payload-config'
import { createFirstRole } from '../collections/utilities/createFirstRole'
import { tenants } from '../seed/tenants'
import { initialData } from '../seed/db'
import { tenantUser } from '../seed/tenant-user'
import { tenantRoles } from '../seed/tenant-roles'

async function run() {
  const params = process.argv.slice(2)
  const payload = await getPayload({ config })

  switch (params[0]) {
    case 'all':
      await initialData(payload)
      break
    case 'roles':
      await createFirstRole(payload)
      break
    case 'tenants':
      await tenants(payload)
      break
    case 'tenant-roles':
      await tenantRoles(payload)
      break
    case 'tenant-user':
      await tenantUser(payload)
      break
    case 'user':
      await user(payload)
      break
    default:
      console.error('Unknown seed type. Use "user" to seed user data.')
  }

  process.exit(0)
}

await run()
