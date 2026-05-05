import { CollectionConfig, Field } from 'payload'
import { createdByField } from '@/fields/CreatedByField'
import { hasSuperAdminRole } from '@/utilities/getRole'

const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  labels: {
    singular: 'Media',
    plural: 'Media',
  },
  upload: {
    mimeTypes: ['image/*'],
  },
  admin: {
    group: {
      label: 'Media',
      name: 'media',
    },
    // hidden: ({ user }) => !hasSuperAdminRole(user?.userRoles),
  },
  fields: [
    {
      ...createdByField,
      label: 'Uploaded by',
    } as Field,
    {
      type: 'text',
      name: 'text',
      label: 'Text',
    },
  ],
  versions: true,
}

export default Media
