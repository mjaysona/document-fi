import type { CollectionConfig, Field } from 'payload'
import { createdByField } from '@/fields/CreatedByField'
import { createPosts, deletePosts, readPosts, updatePosts } from './access'
import { updatedByField } from '@/fields/UpdatedByField'
import { slugField } from '~/src/fields/SlugField'
import { ensureUniqueSlug } from '../hooks/ensureUniqueSlug'

const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    create: createPosts,
    read: readPosts,
    update: updatePosts,
    delete: () => true,
  },
  admin: {
    useAsTitle: 'title',
    group: false,
  },
  fields: [
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
    ...slugField([ensureUniqueSlug]),
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
  ],
  versions: {
    drafts: true,
  },
}

export default Posts
