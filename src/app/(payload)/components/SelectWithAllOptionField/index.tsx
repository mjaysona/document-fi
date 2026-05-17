'use client'
import type { SelectFieldClientProps } from 'payload'
import { SelectField, useField } from '@payloadcms/ui'
import React, { useEffect } from 'react'

const ALL_VALUE = 'all'
const ACCESS_VALUES = ['read', 'create', 'update', 'delete'] as const

const normalizeAccessSelection = (input: string[] | undefined): string[] => {
  const values = Array.isArray(input) ? input : []
  if (!values.includes(ALL_VALUE)) {
    return values
  }

  const withAllApplied = [...ACCESS_VALUES]
  return withAllApplied
}

interface SelectWithAllOptionFieldProps extends Omit<SelectFieldClientProps, 'value' | 'onChange'> {
  value?: string[]
  onChange?: (value: string[]) => void
}

const SelectWithAllOptionFieldClient: React.FC<SelectFieldClientProps> = ({
  field,
  path,
  permissions,
}) => {
  const { value, setValue } = useField<string[]>({ path })
  const [filteredValue, setFilteredValue] = React.useState<string[]>(
    normalizeAccessSelection(value),
  )

  useEffect(() => {
    setValue(filteredValue)
  }, [filteredValue])

  useEffect(() => {
    const normalized = normalizeAccessSelection(value)
    if (JSON.stringify(normalized) !== JSON.stringify(value ?? [])) {
      setValue(normalized)
    }
  }, [setValue, value])

  const handleChange = (newValue: string[]) => {
    setFilteredValue(normalizeAccessSelection(newValue))
  }

  const selectFieldProps: SelectWithAllOptionFieldProps = {
    field,
    path,
    value,
    readOnly: permissions !== true && !permissions?.update,
    onChange: handleChange,
  }

  return <SelectField {...(selectFieldProps as SelectFieldClientProps)} />
}

export default SelectWithAllOptionFieldClient
