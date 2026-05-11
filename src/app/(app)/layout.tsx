import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import { mantineHtmlProps, ColorSchemeScript } from '@mantine/core'
import { ThemeProvider } from '@/app/providers/Theme'
import { AuthProvider } from '@/app/providers/Auth'
import './app.css'
import { auth } from '@/app/(app)/lib/auth'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '~/payload.config'
import { User } from '~/payload-types'
import { ROLES } from '@/collections/UserRoles/roles.enum'
import { QueryProvider } from '@/app/providers/Query'

export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let user: User | null = null
  let session: { userId: string } | null = null
  const headersList = await headers()

  try {
    const activeSession = await auth.api.getSession({
      headers: headersList,
    })

    if (activeSession) {
      const payload = await getPayload({ config })

      session = activeSession.session
      user = await payload.findByID({
        collection: 'users',
        id: session?.userId || '',
      })

      if (!user?.userRoles?.length || user?.isFresh) {
        const roles = await payload.find({
          collection: 'user-roles',
          where: {
            label: {
              equals: ROLES.USER,
            },
          },
        })

        if (roles?.docs?.length) {
          await payload.update({
            collection: 'users',
            id: user.id,
            data: {
              userRoles: [roles.docs[0].id],
              isFresh: false,
            },
          })
        }
      }
    }
  } catch (error) {
    console.error('Failed to initialize app session in RootLayout:', error)
    user = null
    session = null
  }

  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider user={user} isValidSession={Boolean(session)}>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
