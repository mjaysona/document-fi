import type { Block } from 'payload'

export const TwoColumn: Block = {
  slug: 'two-column',
  labels: {
    singular: 'Two Column',
    plural: 'Two Columns',
  },
  fields: [
    {
      type: 'text',
      name: 'title',
      label: 'Title',
    },
  ],
  admin: {
    disableBlockName: true,
  },
}
