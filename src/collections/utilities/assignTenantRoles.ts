import { Payload } from 'payload'

/*
 * Assigns the "Super Admin" tenant role to a user within tenant-1
 * Not to be confused with a top level super admin user.
 */
export const assignTenantRoles = async (payload: Payload): Promise<void> => {
  // First get the tenant with slug 'tenant-1'
  const tenant = await payload.find({
    collection: 'tenants',
    where: {
      slug: {
        equals: 'tenant-1',
      },
    },
  })

  if (!tenant?.docs?.length) {
    console.error('Tenant-1 not found, cannot assign role.')
    return
  }

  const tenantId = tenant.docs[0].id

  // Find the super admin user who is part of tenant-1
  const superAdminUser = await payload.find({
    collection: 'users',
    where: {
      email: {
        equals: 'super@payloadcms.com',
      },
      'tenants.tenant': {
        equals: tenantId,
      },
    },
  })

  const superAdminRole = await payload.find({
    collection: 'user-roles',
    where: {
      label: {
        equals: 'Super Admin',
      },
    },
  })

  if (!superAdminUser?.docs?.length || !superAdminRole?.docs?.length) {
    console.error('Super Admin user or role not found, cannot assign role.')
    return
  }

  const userEmail = superAdminUser.docs[0].email
  const roleLabel = superAdminRole.docs[0].label
  const tenantName = tenant.docs[0].name

  try {
    // Update the user's tenant role for tenant-1
    await payload.update({
      collection: 'users',
      id: superAdminUser.docs[0].id,
      data: {
        tenants: [
          {
            tenant: tenantId,
            roles: [superAdminRole.docs[0].id],
          },
        ],
      },
      overrideAccess: true,
    })
    console.info(
      `Role "${roleLabel}" assigned to user "${userEmail}" for tenant "${tenantName}" successfully.`,
    )
  } catch (error) {
    console.error(
      `Error assigning role "${roleLabel}" to user "${userEmail}" for tenant "${tenantName}":`,
      error,
    )
  }
}
