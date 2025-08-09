'use server'

import type { ArrayField, DefaultServerCellComponentProps } from 'payload'
import { UserRole } from '@payload-types'
import { AccessTypeLabel } from '@/enums'
import { Pill } from '@payloadcms/ui'
import { PillProps } from '@payloadcms/ui/elements/Pill'

type Permission = NonNullable<UserRole['permissions'] | UserRole['groupedPermissions']>[number]

const PermissionsCellComponentServer: React.FC<DefaultServerCellComponentProps> = async (props) => {
  const { field, cellData } = props

  if (!cellData.length) {
    return (
      <div>
        There is no {(field as ArrayField).name === 'groupedPermissions' && 'group '}permissions for
        this role
      </div>
    )
  }

  const getAccessPermissions = (permission: Permission) => {
    const accessLabels = permission.access?.map((access) => AccessTypeLabel[access]) || []
    const sortedAccessLabels = accessLabels.sort((a, b) => {
      const aIndex = Object.values(AccessTypeLabel).indexOf(a)
      const bIndex = Object.values(AccessTypeLabel).indexOf(b)
      return aIndex - bIndex
    })

    if (sortedAccessLabels.length === 1) {
      return (
        <Pill pillStyle={getPillType(sortedAccessLabels[0] || '')} size="small">
          {accessLabels[0]}
        </Pill>
      )
    }

    const lastAccess = sortedAccessLabels.pop()

    return (
      <span>
        {sortedAccessLabels.map((accessLabel, index) => (
          <span key={accessLabel}>
            <Pill pillStyle={getPillType(accessLabel)} size="small">
              {accessLabel}
            </Pill>
            ,{' '}
          </span>
        ))}{' '}
        and{' '}
        <Pill pillStyle={getPillType(lastAccess || '')} size="small">
          {lastAccess}
        </Pill>
      </span>
    )
  }

  const getCollectionLabel = (permission: Permission) => {
    return ('collectionSlug' in permission ? permission.collectionSlug : permission.group)
      ?.split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getPillType = (accessLabel: string): PillProps['pillStyle'] => {
    switch (accessLabel) {
      case AccessTypeLabel.create:
        return 'success'
      case AccessTypeLabel.read:
        return 'light-gray'
      case AccessTypeLabel.update:
        return 'warning'
      case AccessTypeLabel.delete:
        return 'error'
      default:
        return 'dark'
    }
  }

  return (
    <div>
      {cellData.map((permission: Permission) => {
        const permissionKey = 'collectionSlug' in permission ? 'collectionSlug' : 'group'
        if (!permission[permissionKey as keyof Permission]) {
          return null
        }

        return (
          <div key={`${permission[permissionKey as keyof Permission]}`}>
            <div>
              Can {getAccessPermissions(permission)} {getCollectionLabel(permission)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PermissionsCellComponentServer
