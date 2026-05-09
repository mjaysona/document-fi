import { getPayload } from 'payload'
import { user } from '../seed/user'
import config from '@payload-config'
import { createFirstRole } from '../collections/utilities/createFirstRole'
import { initialData } from '../seed/db'
import { financialAccounts } from '../seed/financialAccounts'
import { banks } from '../seed/banks'
import { posts } from '../seed/posts'

async function run() {
  const params = process.argv.slice(2)
  const payload = await getPayload({ config })

  switch (params[1]) {
    case 'all':
      await initialData(payload)
      break
    case 'posts':
      await posts(payload)
      break
    case 'roles':
      await createFirstRole(payload)
      break
    case 'user':
      await user(payload)
      break
    case 'accounts':
      await financialAccounts(payload)
      break
    case 'banks':
      await banks(payload)
      break
    default:
      console.error(
        'Unknown seed type. Use "all", "accounts", "banks", "roles", "posts", or "user".',
      )
  }

  process.exit(0)
}

await run()
