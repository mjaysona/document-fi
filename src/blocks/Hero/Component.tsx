// import type { BannerBlock as BannerBlockProps } from 'src/payload-types'

import React from 'react'
// import RichText from '@/components/RichText'

type Props = {
  className?: string
}

export const BannerBlock: React.FC<Props> = ({ className }) => {
  return (
    <div>
      <div>{/* <RichText data={content} enableGutter={false} enableProse={false} /> */}</div>
    </div>
  )
}
