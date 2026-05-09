import type { CollectionConfig } from 'payload'
import { createVehicles, readVehicles, updateVehicles, deleteVehicles } from './access'

const Vehicles: CollectionConfig = {
  slug: 'vehicles',
  labels: {
    singular: 'Vehicle',
    plural: 'Vehicles',
  },
  access: {
    create: createVehicles,
    read: readVehicles,
    update: updateVehicles,
    delete: deleteVehicles,
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
