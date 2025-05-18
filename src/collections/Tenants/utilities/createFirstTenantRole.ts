import { Tenant } from '@payload-types'
import { PayloadRequest } from 'payload'

export const createFirstTenantRole = async (req: PayloadRequest, tenant: Tenant['id']) => {
  console.info('Attempting to create first tenant role...')

  try {
    await req?.payload.create({
      collection: 'tenant-roles',
      data: {
        label: 'Admin',
        tenant,
        isSystemRole: true,
        permissions: [
          {
            collectionSlug: 'users',
            access: ['read', 'create', 'update', 'delete'],
          },
          {
            collectionSlug: 'tenant-roles',
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
        ],
      },
    })

    console.info('Default tenant roles are created successfully')
  } catch (error) {
    console.error('Error creating first tenant role:', error)
  }
}
