'use server'

import type { TextFieldServerProps } from 'payload'
import React from 'react'
import SyncAllocationTotalsFieldClient from './index.client'

const SyncAllocationTotalsFieldServer: React.FC<TextFieldServerProps> = async ({
  clientField,
  path,
  permissions,
}) => {
  return (
    <SyncAllocationTotalsFieldClient field={clientField} path={path} permissions={permissions} />
  )
}

export default SyncAllocationTotalsFieldServer
