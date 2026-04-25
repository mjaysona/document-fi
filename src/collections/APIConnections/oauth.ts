import { createHmac } from 'crypto'
import type { PayloadRequest } from 'payload'

type OAuthStatePayload = {
  connectionId: string
  next: string
  exp: number
}

type GoogleOAuthConnection = {
  id: number | string
  serviceType?: string | null
  googleOAuthConnected?: boolean | null
  googleOAuthAccessToken?: string | null
  googleOAuthRefreshToken?: string | null
  googleOAuthExpiresAt?: string | null
}

const GOOGLE_ACCESS_TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000

const getStateSecret = (): string => {
  return process.env.PAYLOAD_SECRET || 'payload-secret'
}

const sign = (encodedPayload: string): string => {
  return createHmac('sha256', getStateSecret()).update(encodedPayload).digest('base64url')
}

export const createOAuthState = (payload: OAuthStatePayload): string => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export const verifyOAuthState = (state: string): OAuthStatePayload => {
  const [encodedPayload, signature] = String(state || '').split('.')

  if (!encodedPayload || !signature) {
    throw new Error('Invalid OAuth state.')
  }

  const expectedSignature = sign(encodedPayload)
  if (signature !== expectedSignature) {
    throw new Error('Invalid OAuth state signature.')
  }

  const decoded = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))

  if (!decoded?.connectionId || !decoded?.exp) {
    throw new Error('OAuth state payload is malformed.')
  }

  if (Date.now() > Number(decoded.exp)) {
    throw new Error('OAuth state expired.')
  }

  return decoded as OAuthStatePayload
}

export const getBaseURL = (req: PayloadRequest): string => {
  if (process.env.NEXT_PUBLIC_SERVER_URL) {
    return process.env.NEXT_PUBLIC_SERVER_URL
  }

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
  const forwardedProto = req.headers.get('x-forwarded-proto')
  const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https')

  return `${protocol}://${host}`
}

export const getGoogleOAuthConfig = (req: PayloadRequest) => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret =
    process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || ''

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth client credentials.')
  }

  const baseURL = getBaseURL(req)
  const redirectURI = `${baseURL}/api/api-connections/oauth/google/callback`

  return {
    clientId,
    clientSecret,
    baseURL,
    redirectURI,
  }
}

const isGoogleAccessTokenExpiring = (expiresAt?: null | string): boolean => {
  if (!expiresAt) {
    return true
  }

  const expiresAtMs = new Date(expiresAt).getTime()
  if (!Number.isFinite(expiresAtMs)) {
    return true
  }

  return Date.now() + GOOGLE_ACCESS_TOKEN_REFRESH_WINDOW_MS >= expiresAtMs
}

const assertGoogleSheetsConnection = (connection: GoogleOAuthConnection): void => {
  if (connection.serviceType !== 'google-sheets') {
    throw new Error('Connection is not configured for Google Sheets.')
  }

  if (!connection.googleOAuthConnected) {
    throw new Error('Google account is not connected.')
  }
}

export const ensureGoogleOAuthAccessToken = async (
  req: PayloadRequest,
  connectionOrId: GoogleOAuthConnection | number | string,
): Promise<{ accessToken: string; connection: GoogleOAuthConnection; refreshed: boolean }> => {
  const connection =
    typeof connectionOrId === 'object'
      ? connectionOrId
      : ((await req.payload.findByID({
          collection: 'api-connections',
          id: connectionOrId,
          depth: 0,
          overrideAccess: true,
        })) as GoogleOAuthConnection)

  assertGoogleSheetsConnection(connection)

  const existingAccessToken = String(connection.googleOAuthAccessToken || '').trim()
  if (
    existingAccessToken &&
    !isGoogleAccessTokenExpiring(connection.googleOAuthExpiresAt || null)
  ) {
    return {
      accessToken: existingAccessToken,
      connection,
      refreshed: false,
    }
  }

  const refreshToken = String(connection.googleOAuthRefreshToken || '').trim()
  if (!refreshToken) {
    throw new Error('Google refresh token is missing. Reconnect the Google account.')
  }

  const { clientId, clientSecret } = getGoogleOAuthConfig(req)
  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!refreshResponse.ok) {
    const errorText = await refreshResponse.text()
    throw new Error(`Google token refresh failed: ${errorText}`)
  }

  let refreshedTokenData: {
    access_token?: string
    expires_in?: number
    refresh_token?: string
  }

  try {
    refreshedTokenData = (await refreshResponse.json()) as {
      access_token?: string
      expires_in?: number
      refresh_token?: string
    }
  } catch {
    throw new Error('Failed to parse Google token refresh response.')
  }

  const nextAccessToken = String(refreshedTokenData.access_token || '').trim()
  if (!nextAccessToken) {
    throw new Error('Google token refresh response did not include an access token.')
  }

  const updatedConnection = (await req.payload.update({
    collection: 'api-connections',
    id: connection.id,
    depth: 0,
    overrideAccess: true,
    data: {
      googleOAuthConnected: true,
      googleOAuthAccessToken: nextAccessToken,
      googleOAuthRefreshToken: refreshedTokenData.refresh_token || refreshToken,
      googleOAuthExpiresAt:
        refreshedTokenData.expires_in && Number.isFinite(refreshedTokenData.expires_in)
          ? new Date(Date.now() + refreshedTokenData.expires_in * 1000).toISOString()
          : connection.googleOAuthExpiresAt || undefined,
    },
  })) as GoogleOAuthConnection

  return {
    accessToken: nextAccessToken,
    connection: updatedConnection,
    refreshed: true,
  }
}
