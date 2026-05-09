import { Payload } from 'payload'
import { banks } from './banks'

export const financialAccounts = async (payload: Payload) => {
  await banks(payload)

  const accountsData = [
    { code: 'GCASH', name: 'GCash', startingBalance: 0 },
    { code: 'MAYA', name: 'Maya', startingBalance: 0 },
    { code: 'BDO', name: 'BDO (Banco de Oro)', startingBalance: 0 },
    { code: 'BPI', name: 'BPI (Bank of the Philippine Islands)', startingBalance: 0 },
    { code: 'UNIONBANK', name: 'UnionBank', startingBalance: 0 },
    { code: 'METROBANK', name: 'Metrobank', startingBalance: 0 },
    { code: 'SECURITY', name: 'Security Bank', startingBalance: 0 },
    { code: 'PNB', name: 'PNB (Philippine National Bank)', startingBalance: 0 },
  ]

  const existing = await payload.find({
    collection: 'financial-accounts',
    limit: 1000,
  })

  const bankRecords = await payload.find({
    collection: 'banks',
    limit: 1000,
    depth: 0,
  })

  const existingCodes = new Set(
    existing.docs.map((doc: any) => String(doc.code || '').toUpperCase()),
  )
  const bankByCode = new Map(
    bankRecords.docs.map((doc: any) => [String(doc.code || '').toUpperCase(), String(doc.id)]),
  )

  for (const account of accountsData) {
    if (existingCodes.has(account.code)) continue

    const bankId = bankByCode.get(account.code)
    if (!bankId) continue

    await payload.create({
      collection: 'financial-accounts',
      data: {
        ...account,
        bank: bankId,
        currentBalance: account.startingBalance,
      },
    })
  }
}
