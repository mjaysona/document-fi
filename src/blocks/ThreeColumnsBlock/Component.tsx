// import type { ThreeColumnsBlock as ThreeColumnsBlockProps } from 'src/payload-types'

import React from 'react'
// import RichText from '@/components/RichText'

type Props = {
  className?: string
}

export const ThreeColumnsBlock: React.FC<Props> = ({ className }) => {
  return (
    <div>
      <div>{/* <RichText data={content} enableGutter={false} enableProse={false} /> */}</div>
    </div>
  )
}
