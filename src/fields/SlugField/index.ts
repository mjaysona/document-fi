import { SlugField } from '@nouance/payload-better-fields-plugin/Slug'
import { FieldHook } from 'payload'

export const slugField = (beforeValidateHooks?: FieldHook[], fieldToUse?: string) => {
  let slugField = [
    ...SlugField(fieldToUse || 'title', {
      checkboxOverrides: {
        admin: {
          disableListColumn: true,
        },
      },
      slugOverrides: {
        unique: false,
        admin: {
          hidden: true,
          position: 'sidebar',
        },
      },
    }),
  ]

  // if (beforeValidateHooks?.length) {
  //   beforeValidateHooks.forEach((hook) => {
  //     if (hook) {
  //       slugField[0].hooks!.beforeValidate!.push(hook)
  //     }
  //   })
  // }

  return slugField
}
