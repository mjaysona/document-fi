import { Config } from 'payload'
import { createFirstRole } from '../collections/utilities/createFirstRole'

export const roles: NonNullable<Config['onInit']> = async (payload): Promise<void> => {
  try {
    console.info('Attempting to seed roles...')

    const existingRoles = await payload.count({
      collection: 'user-roles',
    })

    if (existingRoles.totalDocs > 0) {
      console.info('User roles already exist, skipping seed.')
      return
    }

    createFirstRole(payload)

    console.info('User roles seeded successfully.')
  } catch (error) {
    console.error('Error seeding roles:', error)
  }
}
