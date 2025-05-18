import type { Field } from 'payload'

export const featureField: Field = {
  type: 'relationship',
  name: 'feature',
  required: true,
  relationTo: 'features',
  filterOptions: async () => ({ type: { equals: 'tenant' } }),
}
