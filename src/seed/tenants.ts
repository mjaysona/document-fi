import { Config } from 'payload'

export const tenants: NonNullable<Config['onInit']> = async (payload): Promise<void> => {
  try {
    const existingTenants = await payload.find({
      collection: 'tenants',
      limit: 1,
    })

    if (existingTenants.docs.length > 0) {
      console.info('Tenants already exist, skipping...')
      return
    }

    console.info('Creating "Tenant 1"...')

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

    console.info('"Tenant 1" created successfully.')
  } catch (error) {
    console.error('Error creating initial tenants: ', error)
  }
}
