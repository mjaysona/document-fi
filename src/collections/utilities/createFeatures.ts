import { Payload } from 'payload'
import { FEATURES } from '../Features/features.enum'

export const createFeatures = async (payload: Payload): Promise<void> => {
  const existingFeatures = await payload.find({
    collection: 'features',
    where: {
      name: {
        equals: FEATURES.MULTI_TENANCY,
      },
    },
  })

  if (existingFeatures?.docs?.length) {
    console.info(`"${FEATURES.MULTI_TENANCY}" feature already exists, skipping creation.`)
    return
  }

  const existingTenants = await payload.find({
    collection: 'tenants',
    limit: 1,
  })

  if (!existingTenants?.docs?.length) {
    console.info(`No tenants found, skipping creation of "${FEATURES.MULTI_TENANCY}" feature.`)
    return
  }

  console.info(`Attempting to create "${FEATURES.MULTI_TENANCY}" feature.`)

  try {
    await payload.create({
      collection: 'features',
      data: {
        name: FEATURES.MULTI_TENANCY,
        isEnabled: true,
      },
    })
    console.info(`"${FEATURES.MULTI_TENANCY}" feature created successfully.`)
  } catch (error) {
    console.error(`Error creating "${FEATURES.MULTI_TENANCY}" feature:`, error)
  }
}
