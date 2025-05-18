import { ROLES } from '@/collections/Roles/roles.enum'
import { Config } from 'payload'

export const roles: NonNullable<Config['onInit']> = async (payload): Promise<void> => {
  // Seeds the first two roles in the system: Super Admin and User
  try {
    console.info('Attempting to seed roles...')

    const existingRoles = await payload.find({
      collection: 'users',
      limit: 1,
    })

    if (existingRoles.docs.length > 0) {
      console.info('Roles already exist, skipping seed.')
      return
    }

    await payload.create({
      collection: 'roles',
      data: {
        label: ROLES.SUPER_ADMIN,
      },
    })

    await payload.create({
      collection: 'roles',
      data: {
        label: ROLES.USER,
      },
    })

    console.info('Roles seeded successfully.')
  } catch (error) {
    console.error('Error seeding roles:', error)
  }
}
