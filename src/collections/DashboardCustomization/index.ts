import type { GlobalConfig } from 'payload'
import readDashboardCustomization from '@/collections/DashboardCustomization/access/read'
import updateDashboardCustomization from '@/collections/DashboardCustomization/access/update'

const DashboardCustomization: GlobalConfig = {
  slug: 'dashboard-customization',
  label: 'Dashboard Customization',
  access: {
    read: readDashboardCustomization,
    update: updateDashboardCustomization,
  },
  admin: {
    group: {
      label: 'Admin',
      name: 'admin',
    },
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
                      relationTo: 'media',
                    },
                    {
                      name: 'icon',
                      label: 'Icon',
                      type: 'upload',
                      relationTo: 'media',
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
  ],
  endpoints: [
    {
      path: '/brand/logo',
      method: 'get',
      handler: async (req) => {
        const payload = req.payload
        const customization = await payload.findGlobal({
          slug: 'dashboard-customization',
        })
        const logo = customization?.dashboard?.logo

        return Response.json({ data: logo })
      },
    },
  ],
}
export default DashboardCustomization
