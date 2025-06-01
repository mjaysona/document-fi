import { Payload } from 'payload'
import { ROLES } from '../UserRoles/roles.enum'

export const createFirstTenantUser = async (payload: Payload): Promise<void> => {
  const tenants = await payload.find({
    collection: 'tenants',
  })
  let allTenants = tenants?.docs || []

  // check if there is a User role
  const userRole = await payload.find({
    collection: 'user-roles',
    where: {
      label: {
        equals: ROLES.USER,
      },
    },
  })

  if (!userRole?.docs?.length) {
    console.error('No "User" role found, make sure it exists in the "user-roles" collection.')
    return
  }

  if (!allTenants?.length || (allTenants?.length === 1 && allTenants[0].slug === 'platform')) {
    console.info('No valid tenants found, skipping user creation.')
    return
  }

  allTenants.map(async (tenant) => {
    if (tenant.slug === 'platform') return

    const email = `${tenant.slug}-admin@payloadcms.com`

    console.info('Creating the "Admin" user of example tenant with email:', email)

    try {
      await payload.create({
        collection: 'users',
        data: {
          email,
          password: 'admin',
          tenants: [{ tenant, roles: [] }],
          userRoles: [userRole.docs[0].id],
          isSystemAccount: true,
        },
      })

      console.info(`"Admin" user "${email}" for example tenant is created successfully`)
    } catch (error) {
      console.error('Error creating "Admin" user for example tenant:', error)
    }
  })
}
