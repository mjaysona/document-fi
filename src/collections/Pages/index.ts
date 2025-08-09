import { type CollectionConfig, type Field } from 'payload'
import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { createdByField } from '@/fields/CreatedByField'
import { createPages, deletePages, readPages, updatePages } from './access'
import { updatedByField } from '@/fields/UpdatedByField'
import { slugField } from '@/fields/SlugField'
import { ensureUniqueSlug } from '@/collections/hooks/ensureUniqueSlug'

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
  versions: {
    drafts: {
      validate: true,
    },
    maxPerDoc: 10,
  },
}

export default Pages
