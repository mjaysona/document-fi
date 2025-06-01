import { Tenant } from '@payload-types'
import { CollectionSlug, PayloadRequest } from 'payload'

export const createGlobalCollection = async (
  req: PayloadRequest,
  tenant: Tenant['id'],
  collection: CollectionSlug,
) => {
  await req?.payload.create({ collection, data: { tenant } })
}
