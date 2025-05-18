'use client'
import type { OptionObject, SelectFieldClientProps } from 'payload'
import { SelectField, useAllFormFields, useField, useForm, useFormFields } from '@payloadcms/ui'
import React, { useEffect, useState, useRef } from 'react'

interface NonRepeatingArraySelectFieldClientProps extends SelectFieldClientProps {
  arraySelectFieldPath: string
  selectFieldName: string
  textFieldName: string
}

interface ArrayField {
  [key: string]: any
  id: string
}

const NonRepeatingArraySelectField: React.FC<NonRepeatingArraySelectFieldClientProps> = (props) => {
  const {
    field,
    path,
    permissions,
    arraySelectFieldPath,
    selectFieldName,
    textFieldName = 'selectedItems',
  } = props
  const { value } = useField<string>({ path })
  const { getDataByPath } = useForm()
  const arrayField: ArrayField[] = getDataByPath(arraySelectFieldPath)
  const selectedItems = useFormFields(([fields]) => fields[textFieldName])
  const allOptions: OptionObject[] = (field.options as OptionObject[]) || []
  const [_fields, dispatchFields] = useAllFormFields()
  const prevOptionsRef = useRef<ArrayField[]>([])

  useEffect(() => {
    handleRowUpdate()
  }, [])

  useEffect(() => {
    // Check if there's any change in the option properties
    const hasOptionPropertyChanged =
      !prevOptionsRef.current ||
      prevOptionsRef.current.length !== arrayField.length ||
      arrayField.some((currentItem, index) => {
        const prevItem = prevOptionsRef.current[index]
        return !prevItem || currentItem[selectFieldName] !== prevItem[selectFieldName]
      })

    if (hasOptionPropertyChanged) {
      handleRowUpdate()
    }

    // Update the ref with the current values for next comparison
    prevOptionsRef.current = [...arrayField]
  }, [arrayField])

  const handleRowUpdate = () => {
    const selectedItemsValues: string[] = arrayField
      ?.map((item: ArrayField) => item[selectFieldName])
      .filter(Boolean)

    dispatchFields({
      type: 'UPDATE',
      path: textFieldName,
      value: selectedItemsValues,
    })
  }

  const selectFieldProps: SelectFieldClientProps = {
    ...props,
    field: {
      ...field,
      options: allOptions?.filter(
        (option) =>
          !(selectedItems.value as string[])?.includes(option.value) || option.value === value,
      ),
    },
    path,
    value,
    readOnly: permissions !== true && !permissions?.update,
  }

  return <SelectField {...selectFieldProps} />
}

export default NonRepeatingArraySelectField
