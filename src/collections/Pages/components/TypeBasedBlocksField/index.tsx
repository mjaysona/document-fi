'use client'
import type { BlocksFieldClientProps, ClientBlock } from 'payload'
import { BlocksField, useAllFormFields } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'
import { Hero } from '@/blocks/Hero/config'
import { ThreeColumnsBlock } from '@/blocks/ThreeColumnsBlock/config'
import { getSiblingData } from 'payload/shared'

const TypeBasedBlocksField: React.FC<BlocksFieldClientProps> = (props) => {
  const [fields, dispatchFields] = useAllFormFields()
  const { path } = props
  const siblingData = getSiblingData(fields, path)
  const [type, setType] = useState('')
  const heroBlocks = [Hero] as ClientBlock[]
  const threeColumnsBlocks = [ThreeColumnsBlock] as ClientBlock[]
  const allBlocks = [...heroBlocks, ...threeColumnsBlocks] as ClientBlock[]
  let blocks = [] as ClientBlock[]

  useEffect(() => {
    setType(siblingData.type)
  }, [siblingData.type])

  useEffect(() => {
    if (type) {
      dispatchFields({
        type: 'REMOVE_ROW',
        path,
        rowIndex: 0,
      })
    }
  }, [dispatchFields, path, type])

  switch (type) {
    case 'hero':
      blocks = heroBlocks
      break
    case 'threeColumns':
      blocks = threeColumnsBlocks
      break
    case 'all':
      blocks = allBlocks
      break
    default:
      blocks = []
      break
  }

  props.field.blocks = allBlocks

  return <BlocksField {...props} />
}

export default TypeBasedBlocksField
