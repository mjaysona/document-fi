import type { Field, OptionObject, TextField } from 'payload'

type NonRepeatingArraySelectFieldProps = {
  arrayFieldName: string
  arrayFieldLabel: string
  arrayFieldPath: string
  selectFieldName: string
  selectFieldLabel: string
  textFieldName: string
  defaultOptions: OptionObject[]
  arrayFields?: (Field & { isAlignedWithSelectField?: boolean })[]
}

const selectedItemsField = (props: Partial<NonRepeatingArraySelectFieldProps>): TextField => {
  const { arrayFieldPath, selectFieldName, textFieldName = 'selectedItems' } = props

  return {
    type: 'text',
    name: textFieldName,
    hasMany: true,
    admin: {
      hidden: true,
    },
    hooks: {
      beforeChange: [
        ({ siblingData }) => {
          delete siblingData[textFieldName]
        },
      ],
      afterRead: [
        ({ data, value, operation, req }) => {
          if (operation === 'read' && req.user && arrayFieldPath && selectFieldName) {
            const arraySelectField = data?.[arrayFieldPath] || []
            const selectedItems = arraySelectField?.map((item: any) => item?.[selectFieldName])

            return selectedItems
          }

          return value
        },
      ],
    },
    virtual: true,
  }
}

const nonRepeatingArraySelectField = (props: NonRepeatingArraySelectFieldProps): Field[] => {
  const {
    arrayFields,
    defaultOptions,
    arrayFieldName,
    arrayFieldLabel,
    selectFieldName,
    selectFieldLabel,
  } = props
  const fieldsAlignedWithSelectField = arrayFields?.filter(
    (field) => field.isAlignedWithSelectField,
  ) as Field[]
  const fieldsNotAlignedWithSelectField = arrayFields?.filter(
    (field) => !field.isAlignedWithSelectField,
  ) as Field[]

  return [
    {
      type: 'array',
      name: arrayFieldName,
      label: arrayFieldLabel,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: selectFieldName,
              label: selectFieldLabel,
              type: 'select',
              required: true,
              admin: {
                components: {
                  Field: {
                    path: '@/fields/NonRepeatingArraySelectField/components/index',
                    clientProps: {
                      arraySelectFieldPath: arrayFieldName,
                      selectFieldName,
                    },
                  },
                },
                width: '25%',
              },
              options: defaultOptions,
            },
            ...(fieldsAlignedWithSelectField || []),
          ],
        },
        ...(fieldsNotAlignedWithSelectField || []),
      ],
    },
    selectedItemsField(props),
  ]
}

export { nonRepeatingArraySelectField, selectedItemsField }
