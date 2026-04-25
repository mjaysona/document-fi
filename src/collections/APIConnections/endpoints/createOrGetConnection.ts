import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import type { Endpoint } from 'payload'

export const createOrGetConnection: Endpoint = {
  path: '/create-or-get',
  method: 'post',
  handler: async (req) => {
    if (!isSuperAdmin(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
      const body = await req.json()
      const { id } = body

      // If an ID is provided and record exists, return it
      if (id) {
        const existing = await req.payload.findByID({
          collection: 'api-connections',
          id,
          depth: 0,
        })

        if (existing) {
          return Response.json({ id: existing.id, isNew: false })
        }
      }

      // Reuse existing default connection (sourceType is unique in this collection).
      const existingDefault = await req.payload.find({
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
      })

      if (existingDefault.docs.length > 0) {
        return Response.json({ id: existingDefault.docs[0].id, isNew: false })
      }

      // Create a new record with defaults
      const newRecord = await req.payload.create({
        collection: 'api-connections',
        data: {
          sourceType: 'weight-bills',
          serviceType: 'google-sheets',
        },
      })

      return Response.json({ id: newRecord.id, isNew: true })
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Failed to create connection' },
        { status: 500 },
      )
    }
  },
}
