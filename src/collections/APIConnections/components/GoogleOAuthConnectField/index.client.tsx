'use client'

import type { TextFieldClientProps } from 'payload'
import { Button, useField, useDocumentInfo } from '@payloadcms/ui'
import React, { useEffect, useRef, useState } from 'react'

const AUTO_REFRESH_WINDOW_MS = 5 * 60 * 1000

const GoogleOAuthConnectField: React.FC<TextFieldClientProps> = () => {
  const { value: serviceType } = useField<string>({ path: 'serviceType' })
  const { value: connected } = useField<boolean>({ path: 'googleOAuthConnected' })
  const { value: connectedEmail } = useField<string>({ path: 'googleAccountEmail' })
  const { value: expiresAt } = useField<string>({ path: 'googleOAuthExpiresAt' })
  const { id: connectionId } = useDocumentInfo()
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')
  const hasTriedAutoRefresh = useRef(false)

  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const search = typeof window !== 'undefined' ? window.location.search : ''

  useEffect(() => {
    if (
      serviceType !== 'google-sheets' ||
      !connected ||
      !connectionId ||
      hasTriedAutoRefresh.current
    ) {
      return
    }

    const expiresAtMs = new Date(expiresAt || '').getTime()
    if (Number.isFinite(expiresAtMs) && expiresAtMs > Date.now() + AUTO_REFRESH_WINDOW_MS) {
      return
    }

    hasTriedAutoRefresh.current = true

    let isMounted = true

    const refreshToken = async () => {
      setIsRefreshing(true)
      setRefreshError('')

      try {
        const response = await fetch('/api/api-connections/oauth/google/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionId }),
        })

        const data = (await response.json().catch(() => ({}))) as {
          error?: string
          refreshed?: boolean
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to refresh Google access token.')
        }

        if (data.refreshed && isMounted) {
          window.location.reload()
        }
      } catch (error) {
        if (isMounted) {
          setRefreshError(error instanceof Error ? error.message : 'Failed to refresh token.')
        }
      } finally {
        if (isMounted) {
          setIsRefreshing(false)
        }
      }
    }

    void refreshToken()

    return () => {
      isMounted = false
    }
  }, [serviceType, connected, connectionId, expiresAt])

  if (serviceType !== 'google-sheets') {
    return null
  }

  const handleConnect = async () => {
    try {
      setIsLoading(true)

      let finalConnectionId = connectionId
      let next = `${pathname}${search}`

      // If no saved ID, create a new record with defaults
      if (!finalConnectionId) {
        const response = await fetch('/api/api-connections/create-or-get', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: null }),
        })

        if (!response.ok) {
          const error = await response.json()
          alert(`Failed to create connection: ${error.error}`)
          setIsLoading(false)
          return
        }

        const data = (await response.json()) as { id: string }
        finalConnectionId = data.id
        next = `/admin/collections/api-connections/${encodeURIComponent(finalConnectionId)}`
      }

      const startURL = `/api/api-connections/oauth/google/start?connectionId=${encodeURIComponent(finalConnectionId)}&next=${encodeURIComponent(next)}`

      window.location.href = startURL
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontWeight: 600 }}>Google OAuth Connection</div>
      {connected ? (
        <div style={{ color: 'var(--theme-success-500, #2f9e44)', fontSize: 13 }}>
          Connected {connectedEmail ? `as ${connectedEmail}` : ''}
        </div>
      ) : (
        <div style={{ color: 'var(--theme-elevation-500, #666)', fontSize: 13 }}>
          Not connected yet.
        </div>
      )}
      {isRefreshing ? (
        <div style={{ color: 'var(--theme-elevation-700, #555)', fontSize: 12 }}>
          Refreshing Google access token...
        </div>
      ) : null}
      {refreshError ? (
        <div style={{ color: 'var(--theme-error-500, #c92a2a)', fontSize: 12 }}>{refreshError}</div>
      ) : null}
      <Button onClick={handleConnect} disabled={isLoading || isRefreshing} type="button">
        {isLoading
          ? 'Connecting...'
          : isRefreshing
            ? 'Refreshing token...'
            : connected
              ? 'Reconnect Google Account'
              : 'Connect Google Account'}
      </Button>
    </div>
  )
}

export default GoogleOAuthConnectField
