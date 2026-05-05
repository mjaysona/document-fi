import type { CollectionConfig, Field } from 'payload'
import { createdByField } from '@/fields/CreatedByField'
import { updatedByField } from '@/fields/UpdatedByField'
import { createQuotes, readQuotes, updateQuotes, deleteQuotes } from './access'

const quoteItemFields: Field[] = [
  {
    name: 'equipmentId',
    label: 'Equipment',
    type: 'relationship',
    relationTo: 'equipment',
  },
  {
    name: 'name',
    label: 'Name',
    type: 'text',
    required: true,
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
    name: 'quantity',
    label: 'Quantity',
    type: 'number',
    required: true,
    min: 1,
  },
  {
    name: 'images',
    label: 'Images',
    type: 'relationship',
    relationTo: 'equipment-media',
    hasMany: true,
  },
]

const Quotes: CollectionConfig = {
  slug: 'quotes',
  labels: {
    singular: 'Quote',
    plural: 'Quotes',
  },
  access: {
    create: createQuotes,
    read: readQuotes,
    update: updateQuotes,
    delete: deleteQuotes,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'clientName', 'clientEmail', 'updatedAt'],
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    {
      name: 'clientName',
      label: 'Client Name',
      type: 'text',
    },
    {
      name: 'clientEmail',
      label: 'Client Email',
      type: 'email',
    },
    {
      name: 'date',
      label: 'Date',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'MMM d, yyyy',
        },
      },
    },
    {
      name: 'logo',
      label: 'Logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'items',
      label: 'Items',
      type: 'array',
      fields: quoteItemFields,
      minRows: 1,
    },
    {
      ...createdByField,
      admin: {
        ...createdByField.admin,
        hidden: false,
        position: 'sidebar',
      },
    } as Field,
    {
      ...updatedByField,
      admin: {
        ...updatedByField.admin,
        hidden: false,
        position: 'sidebar',
      },
    } as Field,
  ],
  timestamps: true,
}

export default Quotes
