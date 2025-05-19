import { Config } from 'payload'

export const tenants: NonNullable<Config['onInit']> = async (payload): Promise<void> => {
  // Seeds the first tenant in the system: Tenant 1
  try {
    console.info('Attempting to initial tenants...')

    const existingTenants = await payload.find({
      collection: 'tenants',
      limit: 1,
    })

    if (existingTenants.docs.length > 0) {
      console.info('Tenants already exist, skipping...')
      return
    }

    await payload.create({
      collection: 'tenants',
      data: {
        name: 'Platform',
        slug: 'platform',
      },
    })

    await payload.create({
      collection: 'tenants',
      data: {
        name: 'Tenant 1',
        slug: 'tenant-1',
      },
    })

    console.info('Initial tenants added.')
  } catch (error) {
    console.error('Error adding initial tenants: ', error)
  }
}
