import type { BannerBlock as BannerBlockProps } from 'src/payload-types'

import React from 'react'
import RichText from '@/components/RichText'

type Props = {
  className?: string
} & BannerBlockProps

export const BannerBlock: React.FC<Props> = ({ className, content, style }) => {
  return (
    <div>
      <div>
        <RichText data={content} enableGutter={false} enableProse={false} />
      </div>
    </div>
  )
}
