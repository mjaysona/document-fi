import type { AdminViewProps } from 'payload'

import React from 'react'

export const CustomStandaloneView: React.FC<AdminViewProps> = () => {
  return (
    <div>
      <h1>Custom Standalone View</h1>
      <br />
      <p>This is a completely standalone view.</p>
    </div>
  )
}
