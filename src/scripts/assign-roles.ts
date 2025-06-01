import { getPayload } from 'payload'
import config from '@payload-config'
import { assignTenantRoles } from '../collections/utilities/assignTenantRoles'
import { assignUserRoles } from '../collections/utilities/assignUserRoles'

async function run() {
  const params = process.argv.slice(2)
  const payload = await getPayload({ config })

  if (params.includes('user')) {
    await assignUserRoles(payload)
  }

  if (params.includes('tenant-user')) {
    await assignTenantRoles(payload)
  }

  process.exit(0)
}

await run()
