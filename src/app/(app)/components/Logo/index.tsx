'use client'

import Image from 'next/image'

export const Logo = () => {
  return (
    <>
      <Image
        src="/logo-placeholder-01-light--static.svg"
        alt="Logo"
        width={150}
        height={30}
        className="light"
        priority
      />
      <Image
        src="/logo-placeholder-01-dark--static.svg"
        alt="Logo"
        width={150}
        height={30}
        className="dark"
        priority
      />
    </>
  )
}
