import type { CollectionConfig, CollectionSlug } from 'payload'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { hasSuperAdminRole } from '@/utilities/getRole'
import { updateAndDeleteTenants } from './access/updateAndDeleteTenants'
import { createGlobalCollection } from './utilities/createGlobalCollection'
import { createFirstTenantRole } from './utilities/createFirstTenantRole'
import { createFirstTenantUser } from './utilities/createFirstTenantUser'
import { slugField } from '@/fields/SlugField'
import { ensureUniqueTenant } from './hooks/ensureUniqueTenant'
import readTenants from './access/readTenants'

const Tenants: CollectionConfig = {
  slug: 'tenants',
  access: {
    create: ({ req }) => isSuperAdmin(req),
    read: readTenants,
    update: updateAndDeleteTenants,
    delete: updateAndDeleteTenants,
  },
  admin: {
    useAsTitle: 'name',
    group: {
      label: 'Super Admin',
      name: 'super-admin',
    },
    hidden: ({ user }) => !hasSuperAdminRole(user?.roles),
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    {
      name: 'domain',
      label: 'Domain',
      type: 'text',
      admin: {
        description: 'Domain of the tenant, example: tenant.example.com or tenant.com',
      },
    },
    ...slugField([ensureUniqueTenant], 'name'),
    {
      name: 'allowPublicRead',
      label: 'Allow Public Read',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'If checked, logging in is not required to read. Useful for building public pages.',
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    // Every time a new tenant is created, we make sure default collections are created for it
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          const { id, slug } = doc

          await createFirstTenantRole(req, id)
          await createFirstTenantUser(req, { tenant: id, slug: slug })

          const collections: CollectionSlug[] = ['settings']

          collections.forEach(async (collection) => {
            await createGlobalCollection(req, id, collection)
          })
        }
      },
    ],
  },
}

export default Tenants
