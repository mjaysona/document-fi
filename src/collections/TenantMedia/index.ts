import { CollectionConfig, Field } from 'payload'
import { createdByField } from '@/fields/CreatedByField'
import { createTenantMedia, deleteTenantMedia, readTenantMedia, updateTenantMedia } from './access'

const TenantMedia: CollectionConfig = {
  slug: 'tenant-media',
  labels: {
    singular: 'Media',
    plural: 'Media',
  },
  access: {
    create: createTenantMedia,
    read: readTenantMedia,
    update: updateTenantMedia,
    delete: deleteTenantMedia,
  },
  admin: {
    // components: {
    //   Description: {
    //     path: '@/collections/components/ViewDescription/ActiveTenantPill/index#ActiveTenantPill',
    //   },
    // },
  },
  upload: {
    adminThumbnail: 'thumbnail',
    imageSizes: [
      {
        name: 'thumbnail',
        fit: 'cover',
        width: 100,
        height: 100,
        withoutEnlargement: true,
        formatOptions: {
          format: 'webp',
          options: {
            quality: 80,
          },
        },
      },
      {
        name: 'small',
        fit: 'fill',
        width: 400,
        withoutEnlargement: true,
        formatOptions: {
          format: 'webp',
          options: {
            quality: 80,
          },
        },
      },
      {
        name: 'medium',
        fit: 'fill',
        width: 800,
        withoutEnlargement: true,
        formatOptions: {
          format: 'webp',
          options: {
            quality: 80,
          },
        },
      },
      {
        name: 'large',
        fit: 'fill',
        width: 1600,
        withoutEnlargement: true,
        formatOptions: {
          format: 'webp',
          options: {
            quality: 80,
          },
        },
      },
    ],
    resizeOptions: {
      width: 3200,
      withoutEnlargement: true,
    },
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      ...createdByField,
      label: 'Uploaded by',
    } as Field,
    {
      name: 'text',
      label: 'Text',
      type: 'text',
    },
    {
      name: 'prefix',
      label: 'Prefix',
      type: 'text',
      admin: {
        hidden: true,
      },
    },
  ],
  versions: true,
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        const tenant = await req.payload.findByID({
          collection: 'tenants',
          id: data.tenant,
          depth: 1,
        })

        if (tenant) {
          data.prefix = tenant.slug
        }

        return data
      },
    ],
  },
}

export default TenantMedia
