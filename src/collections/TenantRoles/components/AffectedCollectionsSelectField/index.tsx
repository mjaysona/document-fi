'use server'
import type { SelectFieldServerProps } from 'payload'
import React from 'react'
import AffectedCollectionsSelectFieldClient from './index.client'

export interface AffectedCollectionsSelectFieldServerProps
  extends Omit<SelectFieldServerProps, 'field'> {
  configurableCollections: string[]
}

interface CollectionGroup {
  label: string
  value: string
}

interface FilteredCollection {
  label: string
  value: string
  group?: CollectionGroup
}

const AffectedCollectionsSelectFieldServer: React.FC<
  AffectedCollectionsSelectFieldServerProps
> = async ({ clientField, path, payload, permissions, configurableCollections }) => {
  const allCollections = Object.values(payload.collections)
  const filteredCollections: FilteredCollection[] = allCollections
    .map((collection) => {
      const group = collection.config.admin.group
      const result: FilteredCollection = {
        label:
          typeof collection.config.labels.plural === 'string'
            ? collection.config.labels.plural
            : collection.config.slug,
        value: collection.config.slug,
      }

      if (group && typeof group === 'object') {
        result.group = {
          label: group.label || '',
          value: group.name || '',
        }
      }

      return result
    })
    .filter(
      (collection) => configurableCollections.includes(collection.value) && collection.group?.value,
    )

  clientField.options = filteredCollections.map((collection) => ({
    label: collection.label,
    value: collection.value,
  }))

  return (
    <AffectedCollectionsSelectFieldClient
      field={clientField}
      path={path}
      permissions={permissions}
      collections={filteredCollections}
    />
  )
}

export default AffectedCollectionsSelectFieldServer
