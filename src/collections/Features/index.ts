import { CollectionConfig } from 'payload'
import { isSuperAdmin } from '../utilities/access/isSuperAdmin'
import { readFeatures } from './access/readFeatures'
import { FeatureOptions, FEATURES } from './features.enum'
import { hasSuperAdminRole } from '~/src/utilities/getRole'

export const features: FeatureOptions = [
  {
    label: FEATURES.MULTI_TENANCY,
    value: FEATURES.MULTI_TENANCY,
  },
]

const Features: CollectionConfig = {
  admin: {
    useAsTitle: 'name',
    group: {
      label: 'Super Admin',
      name: 'super-admin',
    },
  },
  slug: 'features',
  access: {
    create: async ({ req }) => hasSuperAdminRole(req?.user?.userRoles || []),
    read: async ({ req }) => hasSuperAdminRole(req?.user?.userRoles || []),
    update: async ({ req }) => hasSuperAdminRole(req?.user?.userRoles || []),
    delete: async ({ req }) => false,
  },
  fields: [
    {
      type: 'select',
      name: 'name',
      label: 'Feature',
      required: true,
      options: features,
      admin: {
        readOnly: true,
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
