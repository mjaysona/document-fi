import type { CollectionConfig } from 'payload'
import { createdByField } from '@/fields/CreatedByField'
import {
  createSessionUploads,
  readSessionUploads,
  updateSessionUploads,
  deleteSessionUploads,
} from './access'

const SessionUploads: CollectionConfig = {
  slug: 'session-uploads',
  access: {
    create: () => true,
    read: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'documentType',
      type: 'select',
      options: [{ label: 'Weight Bill', value: 'weight-bill' }],
      required: true,
    },
    {
      name: 'uploads',
      type: 'array',
      fields: [
        { name: 'fileName', type: 'text' },
        {
          name: 'media',
          type: 'relationship',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'savedStatus',
          type: 'select',
          options: [
            { label: 'Unsaved', value: 'unsaved' },
            { label: 'Saved', value: 'saved' },
            { label: 'Verified', value: 'verified' },
          ],
          defaultValue: 'unsaved',
        },
      ],
    },
    createdByField,
  ],
}

export default SessionUploads
