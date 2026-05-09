import type { CollectionConfig } from 'payload'
import { createBanks, deleteBanks, readBanks, updateBanks } from './access'

const Banks: CollectionConfig = {
  slug: 'banks',
  labels: {
    singular: 'Bank',
    plural: 'Banks',
  },
  access: {
    create: createBanks,
    read: readBanks,
    update: updateBanks,
    delete: deleteBanks,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'code'],
  },
  fields: [
    {
      name: 'code',
      label: 'Bank Code',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      unique: true,
    },
  ],
  timestamps: true,
}

export default Banks