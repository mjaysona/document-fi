import type { Block } from 'payload'

export const Hero: Block = {
  slug: 'banner',
  labels: {
    singular: 'Default Banner',
    plural: 'Default Banners',
  },
  admin: {
    disableBlockName: true,
  },
  fields: [
    {
      type: 'text',
      name: 'title',
      label: 'Title',
    },
  ],
}
