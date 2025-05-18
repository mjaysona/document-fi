import { CollectionConfig } from 'payload'
import { isSuperAdmin } from '../utilities/access/isSuperAdmin'
import { isTenantAdmin } from '../utilities/access/isTenantAdmin'
import { readFeatures } from './access/readFeatures'
import { camelCaseFormat } from '../utilities/camelCaseFormat'

const Features: CollectionConfig = {
  admin: {
    useAsTitle: 'label',
    group: {
      label: 'Super Admin',
      name: 'super-admin',
    },
  },
  slug: 'features',
  access: {
    create: async ({ req }) => isSuperAdmin(req),
    read: readFeatures,
    update: async ({ req }) => isSuperAdmin(req),
    delete: async ({ req }) => isSuperAdmin(req),
  },
  fields: [
    {
      type: 'radio',
      name: 'type',
      label: 'Feature for',
      defaultValue: 'tenant',
      options: [
        {
          label: 'Tenant',
          value: 'tenant',
        },
        {
          label: 'Dashboard',
          value: 'dashboard',
        },
      ],
    },
    {
      type: 'text',
      name: 'label',
      label: 'Feature name',
      required: true,
      admin: {
        components: {
          Field: '@/collections/Features/components/FeatureTitleTextField/index',
        },
      },
    },
    {
      name: 'value',
      label: 'Feature value',
      type: 'text',
      required: true,
      admin: {
        hidden: true,
      },
      hooks: {
        beforeChange: [({ data }) => camelCaseFormat(data?.label)],
      },
    },
    {
      name: 'isEnabled',
      label: 'Is Enabled?',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
}

export default Features
