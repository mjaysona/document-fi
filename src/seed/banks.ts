import { Payload } from 'payload'

export const banks = async (payload: Payload) => {
  const banksData = [
    { code: 'GCASH', name: 'GCash' },
    { code: 'MAYA', name: 'Maya' },
    { code: 'BDO', name: 'BDO (Banco de Oro)' },
    { code: 'BPI', name: 'BPI (Bank of the Philippine Islands)' },
    { code: 'UNIONBANK', name: 'UnionBank' },
    { code: 'METROBANK', name: 'Metrobank' },
    { code: 'SECURITY', name: 'Security Bank' },
    { code: 'PNB', name: 'PNB (Philippine National Bank)' },
    { code: 'LANDBANK', name: 'Land Bank of the Philippines' },
    { code: 'DBP', name: 'Development Bank of the Philippines' },
    { code: 'RCBC', name: 'RCBC (Rizal Commercial Banking Corporation)' },
    { code: 'ASIA', name: 'Asia United Bank' },
    { code: 'EASTWEST', name: 'EastWest Bank' },
    { code: 'CHINABANK', name: 'China Bank' },
    { code: 'MAYBANK', name: 'Maybank' },
  ]

  const existing = await payload.find({
    collection: 'banks',
    limit: 1000,
  })

  const existingCodes = new Set(
    existing.docs.map((doc: any) => String(doc.code || '').toUpperCase()),
  )

  for (const bank of banksData) {
    if (existingCodes.has(bank.code)) continue

    await payload.create({
      collection: 'banks',
      data: bank,
    })
  }
}
