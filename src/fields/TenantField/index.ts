import type { Field } from 'payload'
import { tenantFieldUpdate } from './access/update'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { hasTenantSelected } from '../utilities/access/hasTenantSelected'
import { hasSuperAdminRole } from '@/utilities/getRole'
import { getSelectedTenantId } from '@/utilities/getSelectedTenant'

export const tenantField: Field = {
  type: 'relationship',
  name: 'tenant',
  access: {
    read: ({ req }) => {
      if (isSuperAdmin(req)) {
        return true
      }
      return tenantFieldUpdate(req)
    },
    update: ({ req }) => {
      if (hasTenantSelected(req)) {
        return false
      }
      if (isSuperAdmin(req)) {
        return true
      }
      return tenantFieldUpdate(req)
    },
  },
  admin: {
    components: {
      Field: '@/fields/TenantField/components/Field#TenantFieldComponent',
    },
    condition: (_data, _siblingData, { user }) => {
      return Boolean(hasSuperAdminRole(user?.userRoles))
    },
    position: 'sidebar',
  },
  relationTo: 'tenants',
  hasMany: false,
  filterOptions: ({ req }) => {
    const selectedTenantId = getSelectedTenantId(req)

    if (Boolean(selectedTenantId)) {
      return {
        id: { equals: selectedTenantId },
      }
    }

    return false
  },
}
