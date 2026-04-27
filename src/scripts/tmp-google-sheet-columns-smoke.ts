import { updateGoogleSheetFromWeightBillsService } from '../lib/googleSheetWeightBillSync'

const capturedRequests: { url: string; method: string; body: any }[] = []

// Stub global fetch
;(globalThis as any).fetch = async (url: string, init?: RequestInit) => {
  let parsedBody: any = null
  try {
    parsedBody = init?.body ? JSON.parse(init.body as string) : null
  } catch {}
  capturedRequests.push({ url, method: init?.method || 'GET', body: parsedBody })
  return {
    ok: true,
    status: 200,
    text: async () => '{}',
    json: async () => ({}),
  } as Response
}

// Fake payload
const fakePayload = {
  logger: {
    info: (obj: any) => {},
    warn: (obj: any) => {},
    error: (obj: any) => {},
  },
  find: async ({ collection, where, limit, depth, overrideAccess, sort }: any) => {
    if (collection === 'api-connections') {
      return {
        docs: [
          {
            id: 'conn-1',
            sourceType: 'weight-bills',
            serviceType: 'google-sheets',
            isEnabled: true,
            googleOAuthConnected: true,
            googleOAuthAccessToken: 'fake-token-abc',
            spreadsheetId: 'sheet123',
            sheetName: 'WeightBills',
          },
        ],
        totalDocs: 1,
      }
    }
    if (collection === 'weight-bills') {
      return {
        docs: [
          {
            id: 'wb-1',
            weightBillNumber: 'WB-001',
            date: '2024-03-15T00:00:00.000Z',
            customerName: 'Acme Corp',
            vehicle: 'v-1',
            amount: 1500,
            paymentStatus: 'paid',
          },
          {
            id: 'wb-2',
            weightBillNumber: 'WB-002',
            date: '2024-03-20T00:00:00.000Z',
            customerName: 'Beta Ltd',
            vehicle: 'v-2',
            amount: 2200,
            paymentStatus: 'pending',
          },
        ],
        totalDocs: 2,
      }
    }
    if (collection === 'vehicles') {
      return {
        docs: [
          { id: 'v-1', name: 'Truck Alpha' },
          { id: 'v-2', name: 'Van Beta' },
        ],
        totalDocs: 2,
      }
    }
    return { docs: [], totalDocs: 0 }
  },
} as any

async function run() {
  const result = await updateGoogleSheetFromWeightBillsService(fakePayload)

  // Find the PUT request (update, not clear)
  const putReq = capturedRequests.find((r) => r.method === 'PUT')
  const putValues: string[][] = putReq?.body?.values ?? []
  const putHeaderRow = putValues[0] ?? []
  const putFirstDataRow = putValues[1] ?? []

  const output = {
    summary: result.summary ?? null,
    putHeaderRow,
    putFirstDataRow,
  }

  console.log(JSON.stringify(output, null, 2))
  process.exit(0)
}

await run()
