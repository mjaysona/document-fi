import { Tenant } from '@payload-types'
import { PayloadRequest } from 'payload'

export const createFirstTenantUser = async (
  req: PayloadRequest,
  { tenant, slug }: { tenant: Tenant['id']; slug: Tenant['slug'] },
) => {
  console.info('Attempting to create first tenant user...')

  const { payload } = req

  const tenantAdminRole = await payload.find({
    collection: 'tenant-roles',
    where: {
      label: {
        equals: 'Admin',
      },
      tenant: {
        equals: tenant,
      },
    },
  })
  const userRole = await payload.find({
    collection: 'roles',
    where: {
      label: {
        equals: 'User',
      },
    },
  })

  const tenantAdminRoleId = tenantAdminRole.docs[0]?.id
  const userRoleId = userRole.docs[0]?.id
  const email = slug + '-admin' + '@payloadcms.com'

  console.info('Creating first tenant user with email:', email)

  try {
    await req?.payload.create({
      collection: 'users',
      data: {
        email: email,
        password: slug,
        tenants: [{ tenant, roles: tenantAdminRoleId ? [tenantAdminRoleId] : [] }],
        roles: [userRoleId],
        isSystemAccount: true,
      },
    })

    console.info(`First tenant user with email: ${email} is created successfully`)
  } catch (error) {
    console.error('Error creating first tenant user:', error)
  }
}
