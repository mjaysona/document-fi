import React from 'react'
import Image from 'next/image'

//create type for props
type AdminLogoClientProps = {
  src: string
  width: number
  height: number
  alt?: string
}

const AdminLogoClient = (props: AdminLogoClientProps) => {
  const { src, width, height, alt } = props

  return <Image src={src} width={width} height={height} alt={alt || 'Admin Logo'} />
}

export default AdminLogoClient
