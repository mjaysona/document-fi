import type { Access, CollectionSlug } from 'payload'
import getGenericRoleBasedAccess from '@/collections/utilities/access/getGenericRoleBasedAccess'
import { AccessType } from '@/enums'

const userConfigurationsSlug = 'user-configurations' as CollectionSlug

const createUserConfigurations: Access<Record<string, unknown>> = async (args) =>
  await getGenericRoleBasedAccess(args, userConfigurationsSlug, AccessType.CREATE)

export default createUserConfigurations
