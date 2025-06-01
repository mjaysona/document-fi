import { camelCaseFormat } from '@/collections/utilities/camelCaseFormat'
import type { Field } from 'payload'
import { hasSuperAdminRole } from '@/utilities/getRole'

export const propertyField: Field = {
  type: 'text',
  name: 'value',
  admin: {
    condition: (_data, _siblingData, { user }) => Boolean(hasSuperAdminRole(user?.userRoles)),
    readOnly: true,
    position: 'sidebar',
  },
  required: true,
  hooks: {
    beforeChange: [
      ({ data }) => {
        return camelCaseFormat(data?.label)
      },
    ],
  },
}
