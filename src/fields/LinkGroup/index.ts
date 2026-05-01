import type { ArrayField, Field } from 'payload'
import deepMerge from '@/utilities/deepMerge'
// import { linkField, LinkAppearances } from '@/fields/LinkField'

type LinkGroupType = (options?: { appearances?: false; overrides?: Partial<ArrayField> }) => Field

const linkGroup: LinkGroupType = ({ appearances, overrides = {} } = {}) => {
  const generatedLinkGroup: Field = {
    type: 'array',
    name: 'links',
    admin: {
      initCollapsed: true,
    },
    fields: [
      // linkField({
      //   appearances,
      // }),
    ],
  }

  return deepMerge(generatedLinkGroup, overrides)
}

export { linkGroup }
