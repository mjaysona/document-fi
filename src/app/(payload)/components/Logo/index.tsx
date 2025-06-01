import { getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { PaginatedDocs, UIFieldServerProps } from 'payload'
import * as React from 'react'
import { getClientSideURL } from '@/utilities/getURL'
import { headers } from 'next/headers'
import AdminLogoClient from './index.client'
import { Setting } from 'payload-types'

const fetchDashboardIcon = async (tenantSettings: PaginatedDocs<Setting>) => {
  const dashboardSettings = tenantSettings.docs[0]?.dashboard
  const icon = dashboardSettings?.logo?.icon

  if (icon?.url) {
    return <AdminLogoClient src={icon?.url} width={40} height={40} />
  }

  return <>...</>

  // Uncomment for locally persistent media
  // const filename = typeof icon === 'object' ? icon?.filename : icon
  // let logoSrc
  // if (filename && typeof filename === 'string') {
  //   try {
  //     const logo = await import(`../../../media/${filename}`)
  //     logoSrc = logo.default
  //   } catch (error) {}
  // }
  // return filename && logoSrc ? <AdminLogoClient src={logoSrc} width={40} height={40} /> : <>...</>
}

const fetchLoginLogo = async () => {
  const headersList = headers()
  const host = (await headersList).get('host')
  const hostWithoutPort = host?.split(':')[0]

  try {
    if (hostWithoutPort !== 'localhost') {
      const response = await fetch(
        `${getClientSideURL()}/api/settings/tenant-logo/${hostWithoutPort}`,
      )
      const tenantLogo = await response.json()

      if (tenantLogo?.data?.fullSize?.url) {
        return <AdminLogoClient src={tenantLogo.data.fullSize.url} width={120} height={120} />
      }
    }
  } catch (error) {
    console.error('Error fetching tenant logo:', error)
  }

  return <>...</>

  // Uncomment for locally persistent media
  // const tenantLogoFileName = tenantLogo?.data?.fullSize?.filename
  // let logo
  // try {
  //   logo = tenantLogoFileName ? await import(`../../../media/${tenantLogoFileName}`) : ''
  // } catch (error) {
  //   logo = ''
  // }
  // return logo ? <AdminLogoClient src={logo.default} width={120} height={120} /> : <>...</>
}

const AdminLogoServer: React.FC<UIFieldServerProps> = async ({ user, payload }) => {
  if (!user) return await fetchLoginLogo()

  const selectedTenantId = await getSelectedTenantToken()

  try {
    const tenantSettings = await payload.find({
      collection: 'settings',
      where: {
        'tenant.id': {
          equals: selectedTenantId,
        },
      },
    })

    // Tenant settings exists only if user is logged in.
    // This is when we fetch the icon meant inside the dashboard.
    if (tenantSettings?.docs?.length) {
      return await fetchDashboardIcon(tenantSettings)
    }
  } catch (error) {
  } finally {
    return <>...</>
  }
}

export default AdminLogoServer
