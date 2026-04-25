import { createOrGetConnection } from '@/collections/APIConnections/endpoints/createOrGetConnection'
import { oauthGoogleCallback } from '@/collections/APIConnections/endpoints/oauthGoogleCallback'
import { oauthGoogleRefresh } from '@/collections/APIConnections/endpoints/oauthGoogleRefresh'
import { oauthGoogleStart } from '@/collections/APIConnections/endpoints/oauthGoogleStart'
import { isSuperAdmin } from '@/collections/utilities/access/isSuperAdmin'
import { createdByField } from '@/fields/CreatedByField'
import { updatedByField } from '@/fields/UpdatedByField'
import type { Access, CollectionConfig, Field } from 'payload'

const superAdminOnly: Access = ({ req }) => {
  return isSuperAdmin(req)
}

const requiredWhenGoogleSheets = (fieldLabel: string) => {
  return (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
    const serviceType = String(siblingData?.serviceType || '')

    if (serviceType === 'google-sheets') {
      const normalized = String(value || '').trim()
      if (!normalized) {
        return `${fieldLabel} is required when service is Google Sheets.`
      }
    }

    return true
  }
}

const requiredWhenGoogleSheetsAndConnected = (fieldLabel: string) => {
  return (
    value: unknown,
    {
      operation,
      originalDoc,
      siblingData,
    }: {
      operation?: string
      originalDoc?: Record<string, unknown>
      siblingData?: Record<string, unknown>
    },
  ) => {
    const serviceType = String(siblingData?.serviceType || '')
    const oauthConnected = Boolean(
      siblingData?.googleOAuthConnected || originalDoc?.googleOAuthConnected,
    )
    const isConnectingNow =
      operation === 'update' &&
      !Boolean(originalDoc?.googleOAuthConnected) &&
      Boolean(siblingData?.googleOAuthConnected)

    if (serviceType === 'google-sheets' && oauthConnected) {
      const normalized = String(value || '').trim()
      if (!normalized && !isConnectingNow) {
        return `${fieldLabel} is required after Google account is connected.`
      }
    }

    return true
  }
}

const APIConnections: CollectionConfig = {
  slug: 'api-connections',
  labels: {
    singular: '3rd-Party API Connection',
    plural: '3rd-Party API Connections',
  },
  access: {
    create: superAdminOnly,
    read: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'sourceType',
    defaultColumns: ['sourceType', 'serviceType', 'isEnabled'],
    description: 'Configure third-party API integrations used by system records.',
  },
  fields: [
    {
      name: 'sourceType',
      label: 'Source Type',
      type: 'select',
      required: true,
      unique: true,
      options: [{ label: 'Weight Bills', value: 'weight-bills' }],
      defaultValue: 'weight-bills',
    },
    {
      name: 'serviceType',
      label: 'Service Type',
      type: 'select',
      required: true,
      options: [{ label: 'Google Sheets', value: 'google-sheets' }],
      defaultValue: 'google-sheets',
    },
    {
      name: 'googleOAuthConnect',
      label: 'Google Account Connection',
      type: 'text',
      admin: {
        condition: (_data, siblingData) => siblingData?.serviceType === 'google-sheets',
        components: {
          Field: {
            path: '@/collections/APIConnections/components/GoogleOAuthConnectField/index',
          },
        },
      },
    },
    {
      name: 'googleAccountEmail',
      label: 'Google Account Email',
      type: 'email',
      admin: {
        readOnly: true,
        condition: (_data, siblingData) => siblingData?.serviceType === 'google-sheets',
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      type: 'group',
      label: 'OAuth Details',
      admin: {
        condition: (_data, siblingData) => siblingData?.serviceType === 'google-sheets',
      },
      fields: [
        {
          name: 'googleOAuthConnected',
          label: 'Google OAuth Connected',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            readOnly: true,
            condition: (_data, siblingData) => siblingData?.serviceType === 'google-sheets',
          },
          access: {
            create: () => false,
            update: () => false,
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'googleOAuthAccessToken',
              label: 'Google OAuth Access Token',
              type: 'text',
              admin: {
                disableListColumn: true,
                disableListFilter: true,
                width: '50%',
              },
              access: {
                create: () => false,
                update: () => false,
              },
            },
            {
              name: 'googleOAuthRefreshToken',
              label: 'Google OAuth Refresh Token',
              type: 'text',
              admin: {
                disableListColumn: true,
                disableListFilter: true,
                width: '50%',
              },
              access: {
                create: () => false,
                update: () => false,
              },
            },
          ],
        },
        {
          name: 'googleOAuthExpiresAt',
          label: 'Google OAuth Expires At',
          type: 'date',
          admin: {
            readOnly: true,
          },
          access: {
            create: () => false,
            update: () => false,
          },
        },
      ],
    },
    {
      type: 'group',
      label: 'Google Sheet Settings',
      admin: {
        condition: (_data, siblingData) => siblingData?.serviceType === 'google-sheets',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'spreadsheetId',
              label: 'Spreadsheet ID',
              type: 'text',
              index: true,
              validate: requiredWhenGoogleSheetsAndConnected('Spreadsheet ID'),
              admin: {
                description: 'The file location identifier from the Google Sheet URL.',
                width: '50%',
              },
            },
            {
              name: 'sheetName',
              label: 'Sheet Tab Name',
              type: 'text',
              defaultValue: 'Sheet1',
              validate: requiredWhenGoogleSheetsAndConnected('Sheet Tab Name'),
              admin: {
                width: '50%',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'isEnabled',
      label: 'Enabled',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      ...createdByField,
      admin: {
        ...createdByField.admin,
        hidden: false,
        position: 'sidebar',
      },
    } as Field,
    {
      ...updatedByField,
      admin: {
        ...updatedByField.admin,
        hidden: false,
        position: 'sidebar',
      },
    } as Field,
  ],
  endpoints: [createOrGetConnection, oauthGoogleStart, oauthGoogleCallback, oauthGoogleRefresh],
}

export default APIConnections
