'use client'
import type { SelectFieldClientProps } from 'payload'
import { SelectField, useField } from '@payloadcms/ui'
import React, { useEffect } from 'react'

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
  const [filteredValue, setFilteredValue] = React.useState<string[]>(value)

  useEffect(() => {
    if (filteredValue) {
      setValue(filteredValue)
    }
  }, [filteredValue])

  const handleChange = (newValue: string[]) => {
    const prevValue = Array.isArray(value) ? value : []
    const containedAll = prevValue.includes('all')
    const containsAll = newValue.includes('all')

    // Case 1: If adding "all" when it wasn't selected before, only keep "all"
    if (!containedAll && containsAll) {
      setFilteredValue(['all'])
      return
    }

    // Case 2: If removing "all" and selecting other options, keep just the other options
    if (containedAll && newValue.length > 1) {
      const filteredValue = newValue.filter((item) => item !== 'all')
      setFilteredValue([...filteredValue])
      return
    }

    // Default behavior
    setFilteredValue(newValue)
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
