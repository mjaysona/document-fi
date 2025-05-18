import { Access } from 'payload'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { getTenantAccessIDs } from '@/utilities/getTenantAccessIDs'
import { getSelectedTenantId } from '@/utilities/getSelectedTenant'
import { isAccessingViaSubdomain } from '@/collections/utilities/access/isAccessingViaSubdomain'

export const filterByTenantRead: Access = (args) => {
  const req = args.req
  const superAdmin = isSuperAdmin(req)
  const selectedTenant = getSelectedTenantId(req)
  const tenantHost = req.headers.get('host')
  const tenantAccessIDs = getTenantAccessIDs(req.user)

  // First check for manually selected tenant from cookies
  if (selectedTenant) {
    // If it's a super admin,
    // give them read access to only pages for that tenant
    if (superAdmin) {
      return {
        tenant: {
          equals: selectedTenant,
        },
      }
    }

    const hasTenantAccess = tenantAccessIDs.some((id) => id === selectedTenant)

    // If NOT super admin,
    // give them access only if they have access to tenant ID set in cookie
    if (hasTenantAccess) {
      if (isAccessingViaSubdomain(req)) {
        return {
          and: [
            {
              tenant: {
                equals: selectedTenant,
              },
            },
            // {
            //   'tenant.domains.domain': {
            //     equals: tenantHost,
            //   },
            // },
          ],
        }
      }

      return false
    }
  }

  // If no manually selected tenant,
  // but it is a super admin, give access to all
  if (superAdmin) {
    return true
  }

  // If not super admin,
  // but has access to tenants,
  // give access to only their own tenants
  if (tenantAccessIDs.length) {
    return {
      and: [
        {
          tenant: {
            in: tenantAccessIDs,
          },
        },
        // {
        //   'tenant.domains.domain': {
        //     equals: tenantHost,
        //   },
        // },
      ],
    }
  }

  // Deny access to all others
  return false
}

export const canMutatePage: Access = (args) => {
  const req = args.req
  const superAdmin = isSuperAdmin(req)

  if (!req.user) {
    return false
  }

  // super admins can mutate pages for any tenant
  if (superAdmin) {
    return true
  }

  const selectedTenant = getSelectedTenantId(req)

  // tenant admins can add/delete/update
  // pages they have access to
  return (
    req.user?.tenants?.reduce((hasAccess: boolean, accessRow) => {
      if (hasAccess) {
        return true
      }
      if (
        accessRow &&
        accessRow.tenant === selectedTenant &&
        accessRow.roles?.includes('tenant-admin')
      ) {
        return true
      }
      return hasAccess
    }, false) || false
  )
}
