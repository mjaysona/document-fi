import type { BannerBlock as BannerBlockProps } from 'src/payload-types'

import React from 'react'

type Props = {
  className?: string
} & BannerBlockProps

export const BannerBlock: React.FC<Props> = ({ className, content, style }) => {
  return (
    <div>
      <div>Hehe</div>
    </div>
  )
}
