import { getPayload } from 'payload'
import { user } from '../seed/user'
import config from '@payload-config'
import { createFirstRole } from '../collections/utilities/createFirstRole'
import { initialData } from '../seed/db'
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
    default:
      console.error('Unknown seed type. Use "user" to seed user data.')
  }

  process.exit(0)
}

await run()
