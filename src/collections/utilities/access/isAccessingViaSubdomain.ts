import type { PayloadRequest } from 'payload'
import { headers as getHeaders } from 'next/headers'

export const isAccessingViaSubdomain = async (req: PayloadRequest) => {
  const host = req.headers.get('host') || (await getHeaders()).get('host')
  const subdomain = host?.split('.')[0]

  if (subdomain && subdomain !== 'www' && !subdomain.startsWith('localhost')) {
    return true
  }

  return false
}
