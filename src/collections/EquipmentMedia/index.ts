import type { CollectionConfig, Field } from 'payload'
import { createdByField } from '@/fields/CreatedByField'
import {
  createEquipmentMedia,
  readEquipmentMedia,
  updateEquipmentMedia,
  deleteEquipmentMedia,
} from './access'

const EquipmentMedia: CollectionConfig = {
  slug: 'equipment-media',
  labels: {
    singular: 'Equipment Product Image',
    plural: 'Equipment Product Images',
  },
  access: {
    create: createEquipmentMedia,
    read: readEquipmentMedia,
    update: updateEquipmentMedia,
    delete: deleteEquipmentMedia,
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
