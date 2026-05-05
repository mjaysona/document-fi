import path from 'path'
// import { postgresAdapter } from '@payloadcms/db-postgres'
import { en } from 'payload/i18n/en'
import {
  BlockquoteFeature,
  BoldFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  IndentFeature,
  InlineToolbarFeature,
  lexicalEditor,
  OrderedListFeature,
  ParagraphFeature,
  UnderlineFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import Users from '@/collections/Users'
import Media from '@/collections/Media'
import { s3Storage } from '@payloadcms/storage-s3'
import Posts from '@/collections/Posts'
import Pages from '@/collections/Pages'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import UserRoles from './src/collections/UserRoles'
import { initialData } from './src/seed/db'
import Sessions from '@/collections/Sessions'
import Accounts from '@/collections/Accounts'
import UserPreferences from '@/collections/UserPreferences'
import DashboardCustomization from '@/collections/DashboardCustomization'
import WeightBills from '@/collections/WeightBills'
import WeightBillReceipts from '@/collections/WeightBillReceipts'
import SessionUploads from '@/collections/SessionUploads'
import Vehicles from '@/collections/Vehicles'
import APIConnections from '@/collections/APIConnections'
import Equipment from '@/collections/Equipment'
import EquipmentMedia from '@/collections/EquipmentMedia'
import Quotes from '@/collections/Quotes'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const defaultLexicalFeatures = [
  BlockquoteFeature(),
  BoldFeature(),
  HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }),
  IndentFeature(),
  InlineToolbarFeature(),
  HorizontalRuleFeature(),
  OrderedListFeature(),
  ParagraphFeature(),
  UnderlineFeature(),
  UnorderedListFeature(),
]

export default buildConfig({
  //editor: slateEditor({}),
  editor: lexicalEditor({
    features: defaultLexicalFeatures,
  }),
  cors: [
    'http://localhost:3000', // Your front-end application
  ],
  collections: [
    Users,
    Pages,
    Posts,
    UserPreferences,
    Vehicles,
    Equipment,
    EquipmentMedia,
    WeightBills,
    Quotes,
    WeightBillReceipts,
    SessionUploads,

    // Super Admin specific collections below
    APIConnections,
    UserRoles,
    Media,
    Accounts,
    Sessions,
  ],
  globals: [DashboardCustomization],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || '',
    collectionsSchemaOptions: {
      'user-roles': {
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
      // afterNavLinks: ['@/app/(payload)/components/AfterNavLinks'],
      // views: {
      //   CustomDefaultView: {
      //     Component: '@/views/CustomDefault/index#CustomDefaultView',
      //     path: '/custom-default-view',
      //   },
      //   CustomDashboardView: {
      //     Component: '@/views/CustomDashboard/index#CustomDashboardView',
      //     path: '/dashboard',
      //   },
      //   CustomStandaloneView: {
      //     Component: '@/views/CustomStandaloneView#CustomStandaloneView',
      //     path: '/custom-standalone',
      //   },
      //   MinimalCustomView: {
      //     Component: '@/views/CustomMinimalRootView#CustomMinimalRootView',
      //     path: '/custom-minimal',
      //   },
      // },
    },
  },
  async onInit(payload) {
    const processParams = process?.argv?.slice(2)
    if (process.env.SEED_USERS === 'true' && !processParams?.includes('standalone')) {
      await initialData(payload)
    }
  },
  sharp,
  plugins: [
    nestedDocsPlugin({
      collections: ['pages'],
      generateLabel: (_, doc) => doc?.title as string,
      generateURL: (docs) =>
        docs.reduce((url, doc) => `${url}/${doc.slug}`.replace(/^\/+/, '/'), ''),
    }),
    // Only use S3Storage in production when credentials are available
    ...(process.env.S3_BUCKET
      ? [
          s3Storage({
            collections: {
              media: {
                prefix: 'admin',
              },
              'weight-bill-receipts': {
                prefix: 'app/weight-bills',
              },
              'equipment-media': {
                prefix: 'app/equipment',
              },
            },
            bucket: process.env.S3_BUCKET,
            config: {
              credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
              },
              region: process.env.S3_REGION || 'auto',
              endpoint: process.env.S3_ENDPOINT || '',
            },
          }),
        ]
      : []),
    // For local development without S3, files are stored locally (default behavior)
  ],
})
