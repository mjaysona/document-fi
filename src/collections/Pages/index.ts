import { type CollectionConfig, type Field } from 'payload'
import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { Hero } from '@/blocks/Hero/config'
import { createdByField } from '@/fields/CreatedByField'
import { createPages, deletePages, readPages, updatePages } from './access'
import { updatedByField } from '@/fields/UpdatedByField'
import { slugField } from '@/fields/SlugField'
import { Feature } from '@payload-types'
import { TwoColumn } from '@/blocks/TwoColumnBlock/config'
import { ThreeColumnsBlock } from '@/blocks/ThreeColumnsBlock/config'
import { getSelectedTenantId } from '@/utilities/getSelectedTenant'
import { ensureUniqueSlug } from '@/collections/hooks/ensureUniqueSlug'
import { createFirstTenantPage } from '../Tenants/utilities/createFirstTenantPage'

const Pages: CollectionConfig = {
  slug: 'pages',
  access: {
    create: createPages,
    read: readPages,
    update: updatePages,
    delete: deletePages,
  },
  admin: {
    useAsTitle: 'title',
    livePreview: {
      url: ({ data, req }) => {
        const path = generatePreviewPath({
          data,
          slug: typeof data?.slug === 'string' ? data.slug : '',
          collection: 'pages',
          req,
        })

        return path
      },
    },
    preview: (data, { req }) => {
      return generatePreviewPath({
        data,
        slug: typeof data?.slug === 'string' ? data.slug : '',
        collection: 'pages',
        req,
      })
    },
  },
  fields: [
    {
      type: 'checkbox',
      name: 'allowPublicRead',
      label: 'Allow Public Read',
      admin: {
        position: 'sidebar',
      },
      defaultValue: false,
    },
    {
      ...createdByField,
      admin: {
        ...createdByField.admin,
        hidden: false,
        position: 'sidebar',
      },
    } as Field,
    {
      ...updatedByField,
      admin: {
        ...updatedByField.admin,
        hidden: false,
        position: 'sidebar',
      },
    } as Field,
    {
      type: 'text',
      name: 'title',
      label: 'Title',
      required: true,
    },
    ...slugField([ensureUniqueSlug]),
  ],
  hooks: {
    beforeOperation: [
      async ({ operation, req }) => {
        if (operation === 'read') {
          const selectedTenantId = getSelectedTenantId(req)

          if (selectedTenantId) {
            const { payload } = req

            const tenantPages = await payload.find({
              collection: 'pages',
              where: {
                'tenant.id': {
                  equals: selectedTenantId,
                },
              },
            })

            // If no pages exist for the selected tenant, always create a default home page.
            if (!tenantPages?.docs?.length) {
              createFirstTenantPage(req, { tenant: selectedTenantId })
            }
          }
        }
      },
    ],
  },
  versions: {
    drafts: {
      validate: true,
    },
    maxPerDoc: 10,
  },
}

export default Pages
