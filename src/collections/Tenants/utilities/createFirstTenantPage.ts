import { Tenant } from '@payload-types'
import { PayloadRequest } from 'payload'

export const createFirstTenantPage = async (req: PayloadRequest, tenant: Tenant['id']) => {
  console.info('Attempting to create first tenant page...')

  try {
    await req?.payload.create({
      collection: 'pages',
      data: {
        title: 'Home',
        slug: 'home',
        slugLock: false,
        tenant,
        breadcrumbs: [
          {
            label: 'Home',
            url: '/home',
          },
        ],
      },
    })

    console.info('Default tenant page is created successfully')
  } catch (error) {
    console.error('Error creating first tenant page:', error)
  }
}
