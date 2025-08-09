import { UIFieldServerProps } from 'payload'
import * as React from 'react'
import { getClientSideURL } from '@/utilities/getURL'
import AdminLogoClient from './index.client'
import { DashboardCustomization } from 'payload-types'

const fetchDashboardIcon = async (dashboardCustomization: DashboardCustomization) => {
  const dashboard = dashboardCustomization?.dashboard
  const icon = dashboard?.logo?.icon

  if (icon?.url) {
    return <AdminLogoClient src={icon?.url} width={40} height={40} />
  }

  return <>...</>
}

const fetchLoginLogo = async () => {
  try {
    const response = await fetch(`${getClientSideURL()}/api/brand/logo`)
    const logo = await response.json()

    if (logo?.data?.fullSize?.url) {
      return <AdminLogoClient src={logo.data.fullSize.url} width={120} height={120} />
    }
  } catch (error) {
    console.error('Error fetching logo:', error)
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

  try {
    const dashboardCustomization = await payload.findGlobal({
      slug: 'dashboard-customization',
    })

    if (dashboardCustomization) {
      return await fetchDashboardIcon(dashboardCustomization)
    }
  } catch (error) {
  } finally {
    return <>...</>
  }
}

export default AdminLogoServer
