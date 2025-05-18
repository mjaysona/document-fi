import type { Field } from 'payload'

export const createdByField: Field = {
  type: 'relationship',
  name: 'createdBy',
  relationTo: 'users',
  admin: {
    allowCreate: false,
    allowEdit: false,
    readOnly: true,
    sortOptions: 'email',
    hidden: true,
  },
  maxDepth: 1,
  defaultValue: ({ req }) => req.user?.id,
  hooks: {
    beforeChange: [
      ({ operation, previousValue, value }) => {
        return operation === 'create' ? value : previousValue
      },
    ],
  },
}
