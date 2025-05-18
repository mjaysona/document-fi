import { Config } from 'payload'
import { roles } from './roles'
import { tenants } from './tenants'
import { ROLES } from '@/collections/Roles/roles.enum'

export const firstUser: NonNullable<Config['onInit']> = async (payload): Promise<void> => {
  await roles(payload)
  await tenants(payload)

  // Seeds the first user in the system: Super Admin
  try {
    console.info('Attempting to seed first user...')

    const existingUsers = await payload.find({
      collection: 'users',
      limit: 1,
      where: {
        and: [
          {
            'tenants.tenant': {
              equals: null,
            },
          },
        ],
      },
    })

    if (existingUsers.docs.length > 0) {
      console.info('First user already exists, skipping seed.')
      return
    }

    const superAdminRole = await payload.find({
      collection: 'roles',
      where: {
        label: {
          equals: ROLES.SUPER_ADMIN,
        },
      },
    })
    const userRole = await payload.find({
      collection: 'roles',
      where: {
        label: {
          equals: ROLES.USER,
        },
      },
    })

    await payload.create({
      collection: 'users',
      data: {
        email: 'super@payloadcms.com',
        password: 'super',
        roles: [superAdminRole.docs[0].id],
        isSystemAccount: true,
      },
    })

    console.info('First user seeded successfully.')
  } catch (error) {
    console.error('Error seeding first user:', error)
  }
}
