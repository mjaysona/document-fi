'use client'
import type { SelectFieldClientProps } from 'payload'
import { SelectField, useField, useForm } from '@payloadcms/ui'
import React from 'react'

interface CollectionsSelectFieldClientProps extends SelectFieldClientProps {
  collections: { label: string; value: string }[]
  permissionsPath: string
}

interface PermissionsField {
  id: string
  collectionSlug: string
}

const CollectionsSelectFieldClient: React.FC<CollectionsSelectFieldClientProps> = ({
  field,
  collections,
  path,
  permissions,
  permissionsPath,
}) => {
  const { value, setValue } = useField<string>({ path })
  const { getDataByPath } = useForm()
  const permissionsField: PermissionsField[] = getDataByPath(permissionsPath)

  if (permissionsField) {
    const alreadySelectedCollections = permissionsField
      .map((permission) => permission.collectionSlug)
      .filter((permission) => permission)
    const filteredOptions = collections.filter(
      (option) => !alreadySelectedCollections.includes(option.value) || option.value === value,
    )

    field.options = filteredOptions
  }

  const selectFieldProps: SelectFieldClientProps = {
    field,
    path,
    value,
    readOnly: permissions !== true && !permissions?.update,
    onChange: (e) => {
      setValue(e)
    },
  }

  return <SelectField {...selectFieldProps} />
}

export default CollectionsSelectFieldClient
