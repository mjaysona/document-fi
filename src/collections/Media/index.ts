import { CollectionConfig, Field } from 'payload'
import { createdByField } from '@/fields/CreatedByField'
import { hasSuperAdminRole } from '@/utilities/getRole'

const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Media',
    plural: 'Media',
  },
  upload: {
    mimeTypes: ['image/*'],
  },
  admin: {
    group: {
      label: 'Super Admin',
      name: 'super-admin',
    },
    // hidden: ({ user }) => !hasSuperAdminRole(user?.userRoles),
    hidden: true,
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
