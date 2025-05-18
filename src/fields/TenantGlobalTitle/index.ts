import type { Field } from 'payload'

export const tenantGlobalTitle = (title: string): Field => ({
  type: 'text',
  name: 'title',
  admin: {
    hidden: true,
  },
  defaultValue: title,
})
