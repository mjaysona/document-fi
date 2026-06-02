'use client'

import type { TextFieldClientProps } from 'payload'
import { Button, useDocumentInfo } from '@payloadcms/ui'
import React, { useState } from 'react'

const SyncAllocationTotalsField: React.FC<TextFieldClientProps> = () => {
  const { id } = useDocumentInfo()
  const [isSyncing, setIsSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSync = async () => {
    const financialAccountId = String(id || '').trim()
    if (!financialAccountId) {
      setError('Save the record first before syncing totals.')
      setMessage('')
      return
    }

    const shouldSync = window.confirm(
      'Sync allocation totals for this account? This will recompute allocationFunds and allocatedFunds from all related transactions.',
    )
    if (!shouldSync) return

    setIsSyncing(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/financial-accounts/sync-allocation-totals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ financialAccountId }),
      })

      const result = (await response.json().catch(() => ({}))) as {
        error?: string
        allocationFunds?: number
        allocatedFunds?: number
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync allocation totals.')
      }

      setMessage(
        `Synced successfully. Allocated funds: ${result.allocatedFunds ?? 0}, Allocation funds: ${result.allocationFunds ?? 0}`,
      )
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sync allocation totals.')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Button type="button" onClick={handleSync} disabled={isSyncing}>
        {isSyncing ? 'Syncing...' : 'Sync allocation totals'}
      </Button>
      {message ? (
        <div style={{ color: 'var(--theme-success-500, #2f9e44)', fontSize: 12 }}>{message}</div>
      ) : null}
      {error ? (
        <div style={{ color: 'var(--theme-error-500, #c92a2a)', fontSize: 12 }}>{error}</div>
      ) : null}
    </div>
  )
}

export default SyncAllocationTotalsField
