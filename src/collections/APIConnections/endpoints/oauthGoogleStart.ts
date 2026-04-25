import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import type { Endpoint } from 'payload'
import { createOAuthState, getGoogleOAuthConfig } from '../oauth'

export const oauthGoogleStart: Endpoint = {
  path: '/oauth/google/start',
  method: 'get',
  handler: async (req) => {
    if (!isSuperAdmin(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { clientId, redirectURI, baseURL } = getGoogleOAuthConfig(req)

    const url = new URL(req.url || `${baseURL}/api/api-connections/oauth/google/start`)
    const connectionId = url.searchParams.get('connectionId') || ''
    const next = url.searchParams.get('next') || '/admin/collections/api-connections'

    if (!connectionId) {
      return Response.json({ error: 'Missing connection id.' }, { status: 400 })
    }

    const connection = await req.payload.findByID({
      collection: 'api-connections',
      id: connectionId,
      depth: 0,
    })

    if (!connection || connection.serviceType !== 'google-sheets') {
      return Response.json({ error: 'Connection not found for Google Sheets.' }, { status: 404 })
    }

    const state = createOAuthState({
      connectionId,
      next,
      exp: Date.now() + 10 * 60 * 1000,
    })

    const oauthURL = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    oauthURL.searchParams.set('client_id', clientId)
    oauthURL.searchParams.set('redirect_uri', redirectURI)
    oauthURL.searchParams.set('response_type', 'code')
    oauthURL.searchParams.set(
      'scope',
      [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    )
    oauthURL.searchParams.set('access_type', 'offline')
    oauthURL.searchParams.set('prompt', 'consent select_account')
    oauthURL.searchParams.set('include_granted_scopes', 'false')
    oauthURL.searchParams.set('state', state)

    return Response.redirect(oauthURL.toString(), 302)
  },
}
