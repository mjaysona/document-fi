import Layout from '@/app/(app)/components/Layout'
import { getServerSessionId } from '@/app/(app)/utils/getServerSessionId'
import { getPayload } from 'payload'
import config from '~/payload.config'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayload({ config })
  const sessionId = (await getServerSessionId()) || ''
  let newUserPreferences
  let userPreferences

  if (sessionId) {
    const userPreferencesDoc = await payload.find({
      collection: 'user-preferences',
      where: {
        userId: {
          equals: sessionId,
        },
      },
    })

    userPreferences = userPreferencesDoc?.docs?.[0] || null

    if (!userPreferences) {
      newUserPreferences = await payload.create({
        collection: 'user-preferences',
        data: {
          userId: sessionId,
        },
      })
    }
  }

  return (
    <Layout userPreferences={userPreferences || { id: newUserPreferences?.id }}>{children}</Layout>
  )
}
