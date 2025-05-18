import { parseCookies, PayloadRequest } from 'payload'
import { cookies as getCookies } from 'next/headers'

export const getSelectedTenant = async (req: PayloadRequest) => {
  const cookies = parseCookies(req.headers)
  const selectedTenantId = cookies.get('payload-tenant') || (await getSelectedTenantToken())
  const tenants = req.user?.tenants || []

  const selectedTenant = tenants.find(
    ({ tenant }) => typeof tenant !== 'string' && tenant.id === selectedTenantId,
  )

  return selectedTenant
}

// Get the selected tenant ID using payload request headers
export const getSelectedTenantId = (req: PayloadRequest) => {
  const cookies = parseCookies(req.headers)
  const selectedTenant = cookies.get('payload-tenant')

  return selectedTenant
}

// Get the selected tenant ID using next headers
export const getSelectedTenantToken = async () => {
  const cookies = await getCookies()
  const selectedTenantToken = cookies.get('payload-tenant')?.value

  return selectedTenantToken
}

export const hasNoSelectedTenant = (req: PayloadRequest): boolean => {
  const selectedTenantId = getSelectedTenantId(req)

  return Boolean(!selectedTenantId)
}
