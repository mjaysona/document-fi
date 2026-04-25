import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import type { Endpoint } from 'payload'
import { ensureGoogleOAuthAccessToken } from '../oauth'

export const oauthGoogleRefresh: Endpoint = {
  path: '/oauth/google/refresh',
  method: 'post',
  handler: async (req) => {
    if (!isSuperAdmin(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
      const body = await req.json()
      const connectionId = String(body?.connectionId || '').trim()

      if (!connectionId) {
        return Response.json({ error: 'Missing connection id.' }, { status: 400 })
      }

      const result = await ensureGoogleOAuthAccessToken(req, connectionId)

      return Response.json({
        ok: true,
        refreshed: result.refreshed,
        expiresAt: result.connection.googleOAuthExpiresAt || null,
      })
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Failed to refresh Google token.' },
        { status: 500 },
      )
    }
  },
}
