'use client'
import type { SelectFieldClientProps } from 'payload'
import { SelectField, useField, useForm } from '@payloadcms/ui'
import React from 'react'

interface CollectionGroupsSelectFieldClientProps extends SelectFieldClientProps {
  collections: { label: string; value: string }[]
  groupedPermissionsPath: string
}

interface GroupedPermissionsField {
  id: string
  group: string
}

const CollectionGroupsSelectFieldClient: React.FC<CollectionGroupsSelectFieldClientProps> = ({
  field,
  collections,
  path,
  permissions,
  groupedPermissionsPath,
}) => {
  const { value, setValue } = useField<string>({ path })
  const { getDataByPath } = useForm()
  const groupPermissionsField: GroupedPermissionsField[] = getDataByPath(groupedPermissionsPath)

  if (groupPermissionsField) {
    const alreadySelectedCollections = groupPermissionsField
      .map((groupPermission) => groupPermission.group)
      .filter((groupPermission) => groupPermission)
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

export default CollectionGroupsSelectFieldClient
