import { Config } from 'payload'

export const tenants: NonNullable<Config['onInit']> = async (payload): Promise<void> => {
  // Seeds the first tenant in the system: Tenant 1
  try {
    console.info('Attempting to seed tenants...')

    const existingTenants = await payload.find({
      collection: 'tenants',
      limit: 1,
    })

    if (existingTenants.docs.length > 0) {
      console.info('Tenants already exist, skipping seed.')
      return
    }

    await payload.create({
      collection: 'tenants',
      data: {
        name: 'Tenant 1',
        slug: 'tenant1',
        domain: 'tenant1.localhost',
      },
    })

    console.info('Tenants seeded successfully.')
  } catch (error) {
    console.error('Error seeding tenants:', error)
  }
}
