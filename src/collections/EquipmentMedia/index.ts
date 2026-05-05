import type { CollectionConfig, Field } from 'payload'
import { createdByField } from '@/fields/CreatedByField'

const EquipmentMedia: CollectionConfig = {
  slug: 'equipment-media',
  labels: {
    singular: 'Equipment',
    plural: 'Equipments',
  },
  access: {
    read: () => true,
  },
  upload: {
    mimeTypes: ['image/*'],
  },
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'equipment', 'createdAt'],
    group: {
      label: 'Media',
      name: 'media',
    },
  },
  fields: [
    {
      ...createdByField,
      label: 'Uploaded by',
    } as Field,
  ],
  timestamps: true,
}

export default EquipmentMedia
