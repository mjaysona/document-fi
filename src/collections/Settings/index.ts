import type { CollectionConfig, FieldAccess } from 'payload'
import { readSettings, updateSettings } from './access'
import { tenantGlobalTitle } from '@/fields/TenantGlobalTitle'

const Settings: CollectionConfig = {
  slug: 'settings',
  labels: {
    singular: 'Settings',
    plural: 'Settings',
  },
  access: {
    read: readSettings,
    create: () => false,
    update: updateSettings,
    delete: () => false,
  },
  admin: {
    group: {
      label: 'Admin',
      name: 'admin',
    },
    useAsTitle: 'title',
    hidden: true,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'dashboard',
          label: 'Dashboard',
          fields: [
            {
              type: 'group',
              name: 'logo',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'fullSize',
                      label: 'Full Size Logo',
                      type: 'upload',
                      relationTo: 'tenant-media',
                    },
                    {
                      name: 'icon',
                      label: 'Icon',
                      type: 'upload',
                      relationTo: 'tenant-media',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'website',
          label: 'Website',
          fields: [
            {
              name: 'font',
              label: 'Font',
              type: 'select',
              options: [],
              access: {
                update: () => false,
              },
              admin: {
                description: 'This functionality is under development',
                readOnly: true,
              },
            },
          ],
        },
      ],
    },
    tenantGlobalTitle('Admin Settings'),
  ],
  endpoints: [
    {
      path: '/tenant-logo/:tenantHost',
      method: 'get',
      handler: async (req) => {
        const payload = req.payload
        const tenantSettings = await payload.find({
          collection: 'settings',
          where: {
            'tenant.domain': {
              equals: req.routeParams?.tenantHost,
            },
          },
        })

        const tenantLogo = tenantSettings.docs[0]?.dashboard?.logo

        return Response.json({ data: tenantLogo })
      },
    },
  ],
}
export default Settings
