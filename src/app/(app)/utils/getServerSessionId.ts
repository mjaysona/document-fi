import { auth } from '@/app/(app)/lib/auth'
import { headers } from 'next/headers'

export const getServerSessionId = async () => {
  const activeSession = await auth.api.getSession({
    headers: await headers(),
  })

  return activeSession?.session?.userId || null
}
