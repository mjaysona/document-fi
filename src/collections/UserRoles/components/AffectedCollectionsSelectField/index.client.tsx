'use client'
import type { SelectFieldClientProps } from 'payload'
import { SelectField, useAllFormFields, useField } from '@payloadcms/ui'
import React, { useEffect } from 'react'
import { getSiblingData } from 'payload/shared'

interface AffectedCollectionsSelectFieldClientProps extends SelectFieldClientProps {
  collections: { label: string; value: string; group?: { label: string; value: string } }[]
}

const AffectedCollectionsSelectFieldClient: React.FC<AffectedCollectionsSelectFieldClientProps> = (
  props,
) => {
  const [fields] = useAllFormFields()
  const { collections, field, path } = props
  const { value, setValue } = useField<string>({ path })
  const siblingData = getSiblingData(fields, path)

  useEffect(() => {
    const updatedValue = collections
      .filter((collection) => collection.group?.value === siblingData.group)
      .map((collection) => collection.value)

    setValue(updatedValue)
  }, [fields.selectedGroups])

  const selectFieldProps: SelectFieldClientProps = {
    field,
    path,
    value,
    readOnly: true,
    onChange: (e) => {
      setValue(e)
    },
  }

  return <SelectField {...selectFieldProps} />
}

export default AffectedCollectionsSelectFieldClient
