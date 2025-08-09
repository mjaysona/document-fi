'use server'
import type { SelectFieldServerProps } from 'payload'
import React from 'react'
import NonRepeatingArraySelectField from '@/fields/NonRepeatingArraySelectField/components'
import hyphenToTitleCase from '@/utilities/hyphenToTitleCase'

export interface CollectionsSelectFieldServerProps extends Omit<SelectFieldServerProps, 'field'> {
  configurableCollections: string[]
  configurableGlobals: string[]
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
  configurableGlobals,
  selectFieldName,
  textFieldName = 'selectedItems',
}) => {
  const allCollections = Object.values(payload.collections)
  const allGlobals = Object.values(payload.globals.config)

  const filteredCollections: { label: string; value: string }[] = allCollections
    .filter((collection) => configurableCollections.includes(collection.config.slug))
    .map((collection) => ({
      label:
        typeof collection.config.labels.plural === 'string'
          ? collection.config.labels.plural
          : hyphenToTitleCase(collection.config.slug),
      value: collection.config.slug,
    }))
  const filteredGlobals: { label: string; value: string }[] = allGlobals
    .filter((global) => configurableGlobals.includes(global.slug))
    .map((global) => ({
      label: typeof global.label === 'string' ? global.label : hyphenToTitleCase(global.slug),
      value: global.slug,
    }))

  clientField.options = [...filteredCollections, ...filteredGlobals]

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
