import type { Block } from 'payload'

export const ThreeColumnsBlock: Block = {
  slug: 'three-column',
  labels: {
    singular: 'Three Columns Block',
    plural: 'Three Columns Block',
  },
  admin: {
    disableBlockName: true,
  },
  fields: [
    {
      type: 'text',
      name: 'header',
      label: 'Header',
    },
    {
      type: 'text',
      name: 'subheader',
      label: 'Subheader',
    },
  ],
}
