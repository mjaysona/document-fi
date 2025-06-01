import { Config } from 'payload'
import { createFirstRole } from '../collections/utilities/createFirstRole'

export const tenantRoles: NonNullable<Config['onInit']> = async (payload): Promise<void> => {
  try {
    const tenant1 = await payload.find({
      collection: 'tenants',
      where: {
        slug: {
          equals: 'tenant-1',
        },
      },
    })

    if (!tenant1?.docs?.length) {
      console.info('"Tenant 1" does not exist, skipping role creation.')
      return
    }

    await createFirstRole(payload, { tenant: tenant1.docs[0].id, slug: 'tenant-1' })
  } catch (error) {
    console.error('Error seeding "Tenant 1" roles:', error)
  }
}
