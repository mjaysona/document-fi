import {
  createSessions,
  deleteSessions,
  readSessions,
  updateSessions,
} from '@/collections/Sessions/access'
import type { CollectionConfig, Field } from 'payload'

const Sessions: CollectionConfig = {
  slug: 'sessions',
  labels: {
    singular: 'Active Session',
    plural: 'Active Sessions',
  },
  access: {
    create: createSessions,
    read: readSessions,
    update: updateSessions,
    delete: deleteSessions,
  },
  admin: {
    useAsTitle: 'userId',
  },
  fields: [
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      label: 'User ID',
    },
    {
      name: 'token',
      type: 'text',
      required: true,
      label: 'Token',
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      label: 'Expires At',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'ipAddress',
      type: 'text',
      label: 'IP Address',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'userAgent',
      type: 'text',
      label: 'User Agent',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}

export default Sessions
