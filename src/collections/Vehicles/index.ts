import type { CollectionConfig } from 'payload'

const Vehicles: CollectionConfig = {
  slug: 'vehicles',
  labels: {
    singular: 'Vehicle',
    plural: 'Vehicles',
  },
  access: {
    create: () => true,
    read: () => true,
    update: () => true,
    delete: () => true,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'amount', 'updatedAt'],
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'amount',
      label: 'Amount',
      type: 'number',
    },
  ],
  timestamps: true,
}

export default Vehicles
