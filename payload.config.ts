import path from 'path'
// import { postgresAdapter } from '@payloadcms/db-postgres'
import { en } from 'payload/i18n/en'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import Users from '@/collections/Users'
import Media from '@/collections/Media'
import Features from '@/collections/Features'
import Tenants from '@/collections/Tenants'
import Roles from '@/collections/Roles'
import TenantRoles from '@/collections/TenantRoles'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { Config } from 'payload-types'
import { hasSuperAdminRole } from '@/utilities/getRole'
import Settings from '@/collections/Settings'
import { s3Storage } from '@payloadcms/storage-s3'
import Posts from '@/collections/Posts'
import TenantMedia from '@/collections/TenantMedia'
import Pages from '@/collections/Pages'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { firstUser } from '@/seed/firstUser'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  //editor: slateEditor({}),
  editor: lexicalEditor(),
  cors: [
    'http://localhost:3000', // Your front-end application
  ],
  collections: [
    Users,
    TenantRoles,
    Pages,
    Posts,

    // Tenant specific globals below
    Settings,
    TenantMedia,

    // Super Admin specific collections below
    Tenants,
    Roles,
    Features,
    Media,
  ],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || '',
    collectionsSchemaOptions: {
      'tenant-roles': {
        suppressReservedKeysWarning: true,
      },
    },
  }),

  /**
   * Payload can now accept specific translations from 'payload/i18n/en'
   * This is completely optional and will default to English if not provided
   */
  i18n: {
    supportedLanguages: { en },
    translations: {
      en: {
        general: {
          payloadSettings: 'Accessibility',
        },
      },
    },
  },

  admin: {
    autoLogin: {
      email: 'super@payloadcms.com',
      password: 'super',
      prefillOnly: true,
    },
    components: {
      graphics: {
        Logo: '@/app/(payload)/components/Logo',
        Icon: '@/app/(payload)/components/Logo',
      },
      // Uncomment and modify if you want to add custom views
      afterNavLinks: ['@/app/(payload)/components/AfterNavLinks'],
      views: {
        CustomDefaultView: {
          Component: '@/views/CustomDefault/index#CustomDefaultView',
          path: '/custom-default-view',
        },
        CustomDashboardView: {
          Component: '@/views/CustomDashboard/index#CustomDashboardView',
          path: '/dashboard',
        },
        CustomStandaloneView: {
          Component: '@/views/CustomStandaloneView#CustomStandaloneView',
          path: '/custom-standalone',
        },
        MinimalCustomView: {
          Component: '@/views/CustomMinimalRootView#CustomMinimalRootView',
          path: '/custom-minimal',
        },
      },
    },
  },
  async onInit(payload) {
    if (process.env.SEED_DB) {
      await firstUser(payload)
    }
  },
  // Sharp is now an optional dependency -
  // if you want to resize images, crop, set focal point, etc.
  // make sure to install it and pass it to the config.

  // This is temporary - we may make an adapter pattern
  // for this before reaching 3.0 stable
  sharp,
  plugins: [
    multiTenantPlugin<Config>({
      collections: {
        pages: {},
        posts: {},
        settings: { isGlobal: true },
        'tenant-roles': {},
        'tenant-media': {},
      },
      tenantsArrayField: {
        includeDefaultField: false,
      },
      userHasAccessToAllTenants: (user) => hasSuperAdminRole(user?.roles),
      useUsersTenantFilter: false,
    }),
    nestedDocsPlugin({
      collections: ['pages'],
      generateLabel: (_, doc) => doc?.title as string,
      generateURL: (docs) =>
        docs.reduce((url, doc) => `${url}/${doc.slug}`.replace(/^\/+/, '/'), ''),
    }),
    s3Storage({
      collections: {
        media: {
          prefix: 'admin',
        },
        // 'tenant-media': {
        //   disableLocalStorage: true,
        //   generateFileURL: ({ filename, prefix }) => {
        //     return `${process.env.S3_URL}/${process.env.S3_BUCKET}/${prefix}/${filename}`
        //   },
        // },
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        region: process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT || '',
      },
    }),
  ],
})
