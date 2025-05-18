import type { CollectionConfig, Field } from 'payload'
import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { createdByField } from '@/fields/CreatedByField'
import { createPosts, deletePosts, readPosts, updatePosts } from './access'
import { updatedByField } from '@/fields/UpdatedByField'
import { slugField } from '@/fields/SlugField'
import { ensureUniqueSlug } from '../hooks/ensureUniqueSlug'

const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    create: createPosts,
    read: readPosts,
    update: updatePosts,
    delete: deletePosts,
  },
  admin: {
    useAsTitle: 'title',
    livePreview: {
      url: ({ data, req }) => {
        const path = generatePreviewPath({
          data,
          slug: typeof data?.slug === 'string' ? data.slug : '',
          collection: 'posts',
          req,
        })

        return path
      },
    },
    preview: (data, { req }) => {
      return generatePreviewPath({
        data,
        slug: typeof data?.slug === 'string' ? data.slug : '',
        collection: 'posts',
        req,
      })
    },
    hidden: true,
  },
  fields: [
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
    ...slugField([ensureUniqueSlug]),
    {
      name: 'title',
      label: 'Post Title',
      type: 'text',
      required: true,
    },
    {
      name: 'content',
      label: 'Content',
      type: 'richText',
      required: true,
    },
  ],
}

export default Posts
