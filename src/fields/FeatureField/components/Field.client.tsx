'use client'
import { RelationshipField, useField } from '@payloadcms/ui'
import React from 'react'

type Props = {
  initialValue?: string
  path: string
  readOnly?: boolean
}

export const TenantFieldComponentClient: React.FC<Props> = (props) => {
  const { initialValue, readOnly, path } = props

  const { formInitializing, setValue, value } = useField({ path })
  const hasSetInitialValue = React.useRef(false)

  React.useEffect(() => {
    if (!hasSetInitialValue.current && !formInitializing && initialValue && !value) {
      setValue(initialValue)
      hasSetInitialValue.current = true
    }
  }, [initialValue, setValue, formInitializing, value])

  return (
    <RelationshipField
      field={{
        label: 'Tenant',
        name: path,
        relationTo: 'tenants',
        required: true,
        type: 'relationship',
      }}
      path={path}
      readOnly={readOnly}
    />
  )
}
