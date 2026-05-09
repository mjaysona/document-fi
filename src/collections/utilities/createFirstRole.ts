import { UserRole } from '@payload-types'
import { Payload } from 'payload'
import { ROLES } from '../UserRoles/roles.enum'

export const createFirstRole = async (payload: Payload): Promise<void> => {
  const existingRoles = await payload.find({
    collection: 'user-roles',
    where: {
      label: {
        equals: 'Super Admin',
      },
    },
  })
  const collectionSlugs = Object.values(payload.collections)
    .map((collection) => collection.config.slug)
    .filter((slug) => !slug.startsWith('payload'))

  if (existingRoles?.docs?.length) {
    console.info(`"Super Admin" role already exists, skipping creation.`)
  } else {
    console.info(`Attempting to create "Super Admin" role.`)

    try {
      const permissions = collectionSlugs.map((slug) => ({
        collectionSlug: slug,
        access: ['read', 'create', 'update', 'delete'] as (
          | 'read'
          | 'create'
          | 'update'
          | 'delete'
        )[],
      }))
      await payload.create({
        collection: 'user-roles',
        data: {
          label: 'Super Admin',
          isSystemRole: true,
          permissions,
        },
        draft: false,
      })

      console.info(`"Super Admin" role is created successfully`)
    } catch (error) {
      console.error(`Error creating "Super Admin" role:`, error)
    }
  }

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
            collectionSlug: 'dashboard-customization',
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
