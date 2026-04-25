'use server'

import type { TextFieldServerProps } from 'payload'
import React from 'react'
import GoogleOAuthConnectFieldClient from './index.client'

const GoogleOAuthConnectFieldServer: React.FC<TextFieldServerProps> = async ({
  clientField,
  path,
  permissions,
}) => {
  return <GoogleOAuthConnectFieldClient field={clientField} path={path} permissions={permissions} />
}

export default GoogleOAuthConnectFieldServer
