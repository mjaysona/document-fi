import type { CollectionConfig } from 'payload'
import { createEquipment, readEquipment, updateEquipment, deleteEquipment } from './access'

const Equipment: CollectionConfig = {
  slug: 'equipment',
  labels: {
    singular: 'Equipment Item',
    plural: 'Equipment',
  },
  access: {
    create: createEquipment,
    read: readEquipment,
    update: updateEquipment,
    delete: deleteEquipment,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'unitPrice', 'updatedAt'],
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
      name: 'description',
      label: 'Description',
      type: 'textarea',
    },
    {
      name: 'unitPrice',
      label: 'Unit Price',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'images',
      label: 'Images',
      type: 'upload',
      relationTo: 'equipment-media',
      hasMany: true,
    },
  ],
  timestamps: true,
}

export default Equipment
