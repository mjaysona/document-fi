import { AccessArgs, AccessResult, CollectionSlug } from 'payload'
import { isAccessingViaSubdomain } from './isAccessingViaSubdomain'
import { getSelectedTenantId, getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import {
  hasCreatePermission,
  hasDeletePermission,
  hasReadPermission,
  hasUpdatePermission,
} from '@/utilities/getRolePermissions'
import { AccessType } from '@/enums'
import { TenantRole } from '@payload-types'

const getGenericRoleBasedAccess = async (
  args: AccessArgs,
  slug: CollectionSlug | NonNullable<TenantRole['groupedPermissions']>[number]['group'],
  permission: AccessType,
  isTenantGlobal: Boolean = false,
): Promise<AccessResult> => {
  const { req } = args
  const { user } = req

  if (!user) return false

  let hasPermission: boolean = false
  const selectedTenant = getSelectedTenantId(req) || (await getSelectedTenantToken())

  if (!selectedTenant && isTenantGlobal) return false

  const subdomainAccess = await isAccessingViaSubdomain(req)

  switch (permission) {
    case AccessType.CREATE:
      hasPermission = hasCreatePermission(user, selectedTenant, slug, subdomainAccess)
      break
    case AccessType.READ:
      hasPermission = hasReadPermission(user, selectedTenant, slug, subdomainAccess)
      break
    case AccessType.UPDATE:
      hasPermission = hasUpdatePermission(user, selectedTenant, slug, subdomainAccess)
      break
    case AccessType.DELETE:
      hasPermission = hasDeletePermission(user, selectedTenant, slug, subdomainAccess)
      break
    default:
      hasPermission = false
  }

  return hasPermission
}

export default getGenericRoleBasedAccess
