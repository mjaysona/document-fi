import type { CollectionConfig } from 'payload'

const UserPreferences: CollectionConfig = {
  slug: 'user-preferences',
  admin: {
    useAsTitle: 'userId',
    hidden: true,
    defaultColumns: ['userId', 'theme', 'sidenavState'],
  },
  fields: [
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      label: 'User ID',
      required: true,
    },
    {
      name: 'sidenavState',
      label: 'Sidenav State',
      type: 'radio',
      options: [
        {
          label: 'Expanded',
          value: 'expanded',
        },
        {
          label: 'Collapsed',
          value: 'collapsed',
        },
      ],
      defaultValue: 'expanded',
    },
  ],
}

export default UserPreferences
