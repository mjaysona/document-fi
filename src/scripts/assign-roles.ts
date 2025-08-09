import { getPayload } from 'payload'
import config from '@payload-config'
import { assignUserRoles } from '../collections/utilities/assignUserRoles'

async function run() {
  const params = process.argv.slice(2)
  const payload = await getPayload({ config })

  if (params.includes('user')) {
    await assignUserRoles(payload)
  }

  process.exit(0)
}

await run()
