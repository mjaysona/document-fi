'use server'
import type { SelectFieldServerProps } from 'payload'
import React from 'react'
import NonRepeatingArraySelectField from '@/fields/NonRepeatingArraySelectField/components'

export interface CollectionsSelectFieldServerProps extends Omit<SelectFieldServerProps, 'field'> {
  configurableCollections: string[]
  permissionsPath: string
  selectFieldName: string
  textFieldName: string
}

const CollectionsSelectFieldServer: React.FC<CollectionsSelectFieldServerProps> = async ({
  clientField,
  path,
  payload,
  permissions,
  permissionsPath,
  configurableCollections,
  selectFieldName,
  textFieldName = 'selectedItems',
}) => {
  const allCollections = Object.values(payload.collections)
  const filteredCollections: { label: string; value: string }[] = allCollections
    .filter((collection) => configurableCollections.includes(collection.config.slug))
    .map((collection) => ({
      label:
        typeof collection.config.labels.plural === 'string'
          ? collection.config.labels.plural
          : collection.config.slug,
      value: collection.config.slug,
    }))

  clientField.options = filteredCollections

  return (
    <NonRepeatingArraySelectField
      field={clientField}
      arraySelectFieldPath={permissionsPath}
      permissions={permissions}
      path={path}
      selectFieldName={selectFieldName}
      textFieldName={textFieldName}
    ></NonRepeatingArraySelectField>
  )
}

export default CollectionsSelectFieldServer
