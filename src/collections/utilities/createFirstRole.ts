import { Tenant, TenantRole } from '@payload-types'
import { Payload } from 'payload'
import { ROLES } from '../UserRoles/roles.enum'

type CreateFirstRoleParams = {
  payload: Payload
  tenantData?: {
    tenant?: Tenant['id']
    slug?: Tenant['slug']
  }
}

export const createFirstRole = async (
  payload: Payload,
  { tenant, slug }: CreateFirstRoleParams['tenantData'] = { tenant: '', slug: '' },
): Promise<void> => {
  const existingRoles = await payload.find({
    collection: tenant ? 'tenant-roles' : 'user-roles',
    where: {
      label: {
        equals: tenant ? 'Admin' : 'Super Admin',
      },
      ...(tenant && {
        or: [
          {
            'tenant.id': {
              equals: tenant,
            },
          },
          {
            'tenant.slug': {
              equals: slug,
            },
          },
        ],
      }),
    },
  })

  if (existingRoles?.docs?.length) {
    console.info(
      `"${tenant ? 'Admin' : 'Super Admin'}" ${tenant && 'tenant '}role already exists, skipping creation.`,
    )
  } else {
    console.info(
      `Attempting to create "${tenant ? 'Admin' : 'Super Admin'}" ${tenant && 'tenant '}role.`,
    )

    try {
      const permissions: TenantRole['permissions'] = [
        {
          collectionSlug: 'users',
          access: ['read', 'create', 'update', 'delete'],
        },
        {
          collectionSlug: 'pages',
          access: ['read', 'create', 'update', 'delete'],
        },
        {
          collectionSlug: 'posts',
          access: ['read', 'create', 'update', 'delete'],
        },
        {
          group: 'admin',
          collectionSlug: 'settings',
          access: ['read', 'create', 'update', 'delete'],
        },
      ]

      await payload.create({
        collection: tenant ? 'tenant-roles' : 'user-roles',
        data: {
          label: tenant ? 'Admin' : 'Super Admin',
          tenant,
          isSystemRole: true,
          permissions,
        },
      })

      console.info(
        `"${tenant ? 'Admin' : 'Super Admin'}" ${tenant && 'tenant '}role is created successfully`,
      )
    } catch (error) {
      console.error(
        `Error creating "${tenant ? 'Admin' : 'Super Admin'}" ${tenant && 'tenant '}role:`,
        error,
      )
    }
  }

  if (!tenant) {
    const hasUserRole = await payload.find({
      collection: 'user-roles',
      where: {
        label: {
          equals: ROLES.USER,
        },
      },
    })

    if (hasUserRole?.docs?.length) {
      console.info('"User" role already exists, skipping creation.')
      return
    }

    console.info('Creating "User" role for the first time.')
    try {
      await payload.create({
        collection: 'user-roles',
        data: {
          label: ROLES.USER,
          isSystemRole: true,
          permissions: [
            {
              collectionSlug: 'users',
              access: ['read'],
            },
            {
              collectionSlug: 'pages',
              access: ['read'],
            },
            {
              collectionSlug: 'posts',
              access: ['read'],
            },
            {
              group: 'admin',
              collectionSlug: 'settings',
              access: ['read'],
            },
          ],
        },
      })

      console.info('"User" role created successfully.')
    } catch (error) {
      console.error('Error creating "User" role:', error)
    }
  }
}
