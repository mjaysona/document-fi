import type { Endpoint } from 'payload'
import { getGoogleOAuthConfig, verifyOAuthState } from '../oauth'

export const oauthGoogleCallback: Endpoint = {
  path: '/oauth/google/callback',
  method: 'get',
  handler: async (req) => {
    try {
      const { clientId, clientSecret, redirectURI, baseURL } = getGoogleOAuthConfig(req)

      const url = new URL(req.url || `${baseURL}/api/api-connections/oauth/google/callback`)
      const code = url.searchParams.get('code') || ''
      const error = url.searchParams.get('error') || ''
      const state = url.searchParams.get('state') || ''

      if (error) {
        return Response.redirect(`${baseURL}/admin?oauthError=${encodeURIComponent(error)}`, 302)
      }

      if (!code || !state) {
        return Response.json({ error: 'Missing OAuth callback parameters.' }, { status: 400 })
      }

      const statePayload = verifyOAuthState(state)

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectURI,
        }),
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        return Response.redirect(
          `${baseURL}/admin?oauthError=${encodeURIComponent(`Token exchange failed: ${errorText}`)}`,
          302,
        )
      }

      let tokenData: {
        access_token?: string
        refresh_token?: string
        expires_in?: number
      }

      try {
        tokenData = (await tokenResponse.json()) as {
          access_token?: string
          refresh_token?: string
          expires_in?: number
        }
      } catch (error) {
        return Response.redirect(
          `${baseURL}/admin?oauthError=${encodeURIComponent('Failed to parse token response')}`,
          302,
        )
      }

      if (!tokenData || !tokenData.access_token) {
        return Response.redirect(`${baseURL}/admin?oauthError=Missing%20access%20token`, 302)
      }

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      })

      let connectedEmail = ''
      if (userInfoResponse.ok) {
        try {
          const userInfo = (await userInfoResponse.json()) as { email?: string }
          connectedEmail = (userInfo?.email || '').trim()
          if (!connectedEmail || !connectedEmail.includes('@')) {
            return Response.redirect(
              `${baseURL}/admin?oauthError=${encodeURIComponent('Invalid or missing email from Google account')}`,
              302,
            )
          }
        } catch (error) {
          return Response.redirect(
            `${baseURL}/admin?oauthError=${encodeURIComponent('Failed to parse user info response')}`,
            302,
          )
        }
      } else {
        return Response.redirect(
          `${baseURL}/admin?oauthError=${encodeURIComponent('Failed to retrieve Google account email')}`,
          302,
        )
      }

      const existingConnection = await req.payload.findByID({
        collection: 'api-connections',
        id: statePayload.connectionId,
        depth: 0,
      })

      await req.payload.update({
        collection: 'api-connections',
        id: statePayload.connectionId,
        data: {
          googleOAuthConnected: true,
          googleOAuthAccessToken: tokenData.access_token,
          googleOAuthRefreshToken:
            tokenData.refresh_token || existingConnection.googleOAuthRefreshToken || '',
          googleOAuthExpiresAt:
            tokenData.expires_in && Number.isFinite(tokenData.expires_in)
              ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
              : undefined,
          googleAccountEmail: connectedEmail || existingConnection.googleAccountEmail || '',
        },
      })

      const nextPath = statePayload.next || '/admin/collections/api-connections'
      const redirectTarget = nextPath.startsWith('http') ? nextPath : `${baseURL}${nextPath}`
      return Response.redirect(redirectTarget, 302)
    } catch (error) {
      const baseURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
      return Response.redirect(
        `${baseURL}/admin?oauthError=${encodeURIComponent(String(error))}`,
        302,
      )
    }
  },
}
