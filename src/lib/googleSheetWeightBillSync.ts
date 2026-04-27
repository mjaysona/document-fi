import type { Payload } from 'payload'
import { ensureGoogleOAuthAccessTokenForPayload } from '@/collections/APIConnections/oauth'

type ApiConnectionDoc = {
  id: number | string
  sourceType?: string
  serviceType?: string
  isEnabled?: boolean | null
  googleOAuthConnected?: boolean | null
  googleOAuthAccessToken?: string | null
  googleOAuthRefreshToken?: string | null
  googleOAuthExpiresAt?: string | null
  spreadsheetId?: string | null
  sheetName?: string | null
}

export type GoogleSheetSyncStatus =
  | 'success'
  | 'not_configured'
  | 'disabled'
  | 'not_connected'
  | 'misconfigured'
  | 'missing_token'
  | 'write_failed'
  | 'error'

export type GoogleSheetSyncResult = {
  success: boolean
  status: GoogleSheetSyncStatus
  message: string
  summary?: {
    headerCount: number
    rowCount: number
    previewHeaders: string[]
  }
}

const findWeightBillGoogleConnection = async (
  payload: Payload,
): Promise<ApiConnectionDoc | null> => {
  const result = await payload.find({
    collection: 'api-connections',
    where: {
      and: [
        {
          sourceType: {
            equals: 'weight-bills',
          },
        },
        {
          serviceType: {
            equals: 'google-sheets',
          },
        },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  return (result.docs[0] as ApiConnectionDoc | undefined) || null
}

const formatDateValue = (value?: string | null): string => {
  if (!value) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toISOString().split('T')[0] || ''
}

type WeightBillSheetBuildResult = {
  rows: string[][]
  unverifiedSheetRowIndexes: number[]
}

const buildWeightBillRows = async (payload: Payload): Promise<WeightBillSheetBuildResult> => {
  const [weightBillsResult, vehiclesResult] = await Promise.all([
    payload.find({
      collection: 'weight-bills',
      sort: '-date',
      limit: 10000,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'vehicles',
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  const vehiclesById = new Map<string, string>()
  for (const vehicle of vehiclesResult.docs as any[]) {
    vehiclesById.set(String(vehicle.id), String(vehicle.name || ''))
  }

  const rows: string[][] = [
    ['Weight Bill #', 'Date', 'Customer Name', 'Vehicle', 'Amount', 'Payment Status'],
  ]
  const unverifiedSheetRowIndexes: number[] = []

  for (const bill of weightBillsResult.docs as any[]) {
    const targetSheetRowIndex = rows.length
    if (bill.isVerified === false) {
      unverifiedSheetRowIndexes.push(targetSheetRowIndex)
    }

    const vehicleId =
      typeof bill.vehicle === 'string' || typeof bill.vehicle === 'number'
        ? String(bill.vehicle)
        : ''

    rows.push([
      String(bill.weightBillNumber || ''),
      formatDateValue(bill.date),
      String(bill.customerName || ''),
      vehiclesById.get(vehicleId) || vehicleId,
      bill.amount === undefined || bill.amount === null ? '' : String(bill.amount),
      String(bill.paymentStatus || ''),
    ])
  }

  return {
    rows,
    unverifiedSheetRowIndexes,
  }
}

const getSheetIdByTitle = async (args: {
  spreadsheetId: string
  sheetName: string
  executeGoogleRequest: (request: {
    url: string
    method: 'GET' | 'POST' | 'PUT'
    body?: unknown
  }) => Promise<Response>
}): Promise<number | null> => {
  const metadataEndpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(args.spreadsheetId)}?fields=sheets(properties(sheetId,title))`

  const metadataResponse = await args.executeGoogleRequest({
    url: metadataEndpoint,
    method: 'GET',
  })

  if (!metadataResponse.ok) {
    return null
  }

  const metadata = (await metadataResponse.json()) as {
    sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>
  }

  for (const sheet of metadata.sheets || []) {
    if (
      sheet?.properties?.title === args.sheetName &&
      typeof sheet.properties.sheetId === 'number'
    ) {
      return sheet.properties.sheetId
    }
  }

  return null
}

const applyUnverifiedRowFormatting = async (args: {
  spreadsheetId: string
  sheetId: number
  headerCount: number
  totalRows: number
  unverifiedSheetRowIndexes: number[]
  executeGoogleRequest: (request: {
    url: string
    method: 'GET' | 'POST' | 'PUT'
    body?: unknown
  }) => Promise<Response>
}): Promise<boolean> => {
  if (args.headerCount <= 0 || args.totalRows <= 1) {
    return true
  }

  const requests: Array<Record<string, unknown>> = [
    {
      // Reset all data-row background colors so stale red rows are removed.
      repeatCell: {
        range: {
          sheetId: args.sheetId,
          startRowIndex: 1,
          endRowIndex: args.totalRows,
          startColumnIndex: 0,
          endColumnIndex: args.headerCount,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: {
              red: 1,
              green: 1,
              blue: 1,
            },
          },
        },
        fields: 'userEnteredFormat.backgroundColor',
      },
    },
  ]

  for (const rowIndex of args.unverifiedSheetRowIndexes) {
    requests.push({
      repeatCell: {
        range: {
          sheetId: args.sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: 0,
          endColumnIndex: args.headerCount,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: {
              red: 0.95,
              green: 0.55,
              blue: 0.55,
            },
          },
        },
        fields: 'userEnteredFormat.backgroundColor',
      },
    })
  }

  const batchUpdateEndpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(args.spreadsheetId)}:batchUpdate`
  const batchUpdateResponse = await args.executeGoogleRequest({
    url: batchUpdateEndpoint,
    method: 'POST',
    body: { requests },
  })

  return batchUpdateResponse.ok
}

export async function updateGoogleSheetFromWeightBillsService(
  payload: Payload,
): Promise<GoogleSheetSyncResult> {
  try {
    const connection = await findWeightBillGoogleConnection(payload)

    if (!connection) {
      payload.logger.warn({ msg: 'Weight bill sync skipped: API connection is not configured.' })
      return {
        success: false,
        status: 'not_configured',
        message: 'Google Sheet connection is not configured for weight bills.',
      }
    }

    if (connection.isEnabled === false) {
      payload.logger.warn({ msg: 'Weight bill sync skipped: API connection is disabled.' })
      return {
        success: false,
        status: 'disabled',
        message: 'Google Sheet connection is currently disabled.',
      }
    }

    if (!connection.googleOAuthConnected) {
      payload.logger.warn({ msg: 'Weight bill sync skipped: Google OAuth is not connected.' })
      return {
        success: false,
        status: 'not_connected',
        message: 'Google OAuth is not connected. Connect a Google account first.',
      }
    }

    const spreadsheetId = String(connection.spreadsheetId || '').trim()
    const sheetName = String(connection.sheetName || '').trim()

    if (!spreadsheetId || !sheetName) {
      payload.logger.warn({ msg: 'Weight bill sync skipped: spreadsheet settings are incomplete.' })
      return {
        success: false,
        status: 'misconfigured',
        message: 'Spreadsheet ID and Sheet Tab Name are required before sync.',
      }
    }

    let accessToken = ''
    try {
      const ensuredToken = await ensureGoogleOAuthAccessTokenForPayload(payload, connection)
      accessToken = ensuredToken.accessToken
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google OAuth token is invalid.'
      payload.logger.warn({ msg: 'Weight bill sync skipped: OAuth access token is missing.' })
      return {
        success: false,
        status: 'missing_token',
        message: `Google OAuth token could not be refreshed. ${errorMessage}`,
      }
    }

    const executeGoogleRequest = async (request: {
      url: string
      method: 'GET' | 'POST' | 'PUT'
      body?: unknown
    }): Promise<Response> => {
      const send = async (token: string): Promise<Response> => {
        return fetch(request.url, {
          method: request.method,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: request.body === undefined ? undefined : JSON.stringify(request.body),
        })
      }

      let response = await send(accessToken)
      if (response.status !== 401) {
        return response
      }

      // Token may have expired unexpectedly; force-refresh once and retry.
      const refreshedToken = await ensureGoogleOAuthAccessTokenForPayload(payload, connection.id, {
        forceRefresh: true,
      })
      accessToken = refreshedToken.accessToken
      response = await send(accessToken)
      return response
    }

    const { rows, unverifiedSheetRowIndexes } = await buildWeightBillRows(payload)
    const clearRange = `${sheetName}!A:Z`
    const clearEndpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(clearRange)}:clear`
    const clearResponse = await executeGoogleRequest({
      url: clearEndpoint,
      method: 'POST',
      body: {},
    })

    if (!clearResponse.ok) {
      await clearResponse.text()
      payload.logger.warn({
        msg: `Weight bill sync failed while clearing Google Sheet (status ${clearResponse.status}).`,
      })
      return {
        success: false,
        status: 'write_failed',
        message: `Failed to clear Google Sheet before update (HTTP ${clearResponse.status}).`,
      }
    }

    const updateRange = `${sheetName}!A1`
    const updateEndpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(updateRange)}?valueInputOption=RAW`
    const updateResponse = await executeGoogleRequest({
      url: updateEndpoint,
      method: 'PUT',
      body: {
        majorDimension: 'ROWS',
        range: updateRange,
        values: rows,
      },
    })

    if (!updateResponse.ok) {
      await updateResponse.text()
      payload.logger.warn({
        msg: `Weight bill sync failed while writing Google Sheet (status ${updateResponse.status}).`,
      })
      return {
        success: false,
        status: 'write_failed',
        message: `Failed to update Google Sheet (HTTP ${updateResponse.status}).`,
      }
    }

    const sheetId = await getSheetIdByTitle({
      spreadsheetId,
      sheetName,
      executeGoogleRequest,
    })

    if (sheetId === null) {
      payload.logger.warn({
        msg: `Weight bill sync failed while resolving sheet ID for tab "${sheetName}".`,
      })
      return {
        success: false,
        status: 'write_failed',
        message: 'Google Sheet data was written, but row formatting could not be applied.',
      }
    }

    const formattingApplied = await applyUnverifiedRowFormatting({
      spreadsheetId,
      sheetId,
      headerCount: rows[0]?.length || 0,
      totalRows: rows.length,
      unverifiedSheetRowIndexes,
      executeGoogleRequest,
    })

    if (!formattingApplied) {
      payload.logger.warn({
        msg: 'Weight bill sync failed while applying unverified-row formatting.',
      })
      return {
        success: false,
        status: 'write_failed',
        message: 'Google Sheet data was written, but unverified row formatting failed.',
      }
    }

    const dataRowCount = rows.length > 0 ? rows.length - 1 : 0
    const headerRow = rows[0] || []

    payload.logger.info({
      msg: `Weight bill sync completed successfully. Replaced Google Sheet with ${dataRowCount} row(s) from the database.`,
    })

    return {
      success: true,
      status: 'success',
      message: 'Google Sheet updated successfully from the current database records.',
      summary: {
        headerCount: headerRow.length,
        rowCount: dataRowCount,
        previewHeaders: headerRow.slice(0, 10),
      },
    }
  } catch (error) {
    payload.logger.error({
      msg: 'Unexpected error during weight bill Google Sheet sync.',
      err: error,
    })
    return {
      success: false,
      status: 'error',
      message: 'Unexpected error while syncing Google Sheet.',
    }
  }
}
