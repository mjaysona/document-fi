import type { Field } from 'payload'

export const updatedByField: Field = {
  type: 'relationship',
  name: 'updatedBy',
  label: 'Last Updated By',
  admin: {
    allowCreate: false,
    allowEdit: false,
    readOnly: true,
    sortOptions: 'email',
    hidden: true,
  },
  relationTo: 'users',
  maxDepth: 1,
  defaultValue: ({ req }) => req.user?.id,
}
