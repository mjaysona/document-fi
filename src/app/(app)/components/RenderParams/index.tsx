'use client'
import { useSearchParams } from 'next/navigation'
import React from 'react'

import { Message } from '../Message'

export const RenderParams: React.FC = () => {
  const searchParams = useSearchParams()

  // if (paramValues.length) {
  //   return (
  //     <div className={className}>
  //       {paramValues.map((paramValue) => (
  //         <Message
  //           key={paramValue}
  //           message={(message || 'PARAM')?.replace('PARAM', paramValue || '')}
  //         />
  //       ))}
  //     </div>
  //   )
  // }

  return null
}
