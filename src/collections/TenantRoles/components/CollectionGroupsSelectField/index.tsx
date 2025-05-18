'use server'
import type { SelectFieldServerProps } from 'payload'
import React from 'react'
import NonRepeatingArraySelectField from '@/fields/NonRepeatingArraySelectField/components'

export interface CollectionGroupsSelectFieldServerProps
  extends Omit<SelectFieldServerProps, 'field'> {
  configurableCollectionGroups: string[]
  groupedPermissionsPath: string
  selectFieldName: string
  textFieldName: string
}

const CollectionGroupsSelectFieldServer: React.FC<CollectionGroupsSelectFieldServerProps> = async ({
  clientField,
  path,
  payload,
  permissions,
  groupedPermissionsPath,
  configurableCollectionGroups,
  selectFieldName,
  textFieldName = 'selectedItems',
}) => {
  const allCollections = Object.values(payload.collections)
  const filteredCollections: { label: string; value: string }[] = allCollections
    .filter((collection) =>
      configurableCollectionGroups.includes(collection.config.admin.group?.name as string),
    )
    .map((collection) => {
      const collectionGroup = collection.config.admin.group as string

      return {
        label: collectionGroup?.label,
        value: collectionGroup?.name,
      }
    })
    // remove duplicates
    .filter((value, index, self) => {
      return index === self.findIndex((t) => t.label === value.label && t.value === value.value)
    })

  clientField.options = filteredCollections

  return (
    <NonRepeatingArraySelectField
      field={clientField}
      arraySelectFieldPath={groupedPermissionsPath}
      permissions={permissions}
      path={path}
      selectFieldName={selectFieldName}
      textFieldName={textFieldName}
    ></NonRepeatingArraySelectField>
  )
}

export default CollectionGroupsSelectFieldServer
