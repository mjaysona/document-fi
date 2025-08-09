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

  if (existingRoles?.docs?.length) {
    console.info(`"Super Admin" role already exists, skipping creation.`)
  } else {
    console.info(`Attempting to create "Super Admin" role.`)

    try {
      const permissions: UserRole['permissions'] = [
        {
          collectionSlug: 'users',
          access: ['read', 'create', 'update', 'delete'],
        },
        {
          collectionSlug: 'user-roles',
          access: ['read', 'create', 'update', 'delete'],
        },
        {
          collectionSlug: 'media',
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
        {
          collectionSlug: 'sessions',
          access: ['read', 'delete'],
        },
        {
          collectionSlug: 'accounts',
          access: ['read', 'delete'],
        },
      ]

      await payload.create({
        collection: 'user-roles',
        data: {
          label: 'Super Admin',
          isSystemRole: true,
          permissions,
        },
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
