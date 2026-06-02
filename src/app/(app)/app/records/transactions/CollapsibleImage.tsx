import { useState } from 'react'
import { Image, Box, Text } from '@mantine/core'

interface CollapsibleImageProps {
  src: string
  alt?: string
  width?: number | string
  maxWidth?: number | string
  height?: number | string
}

export function CollapsibleImage({
  src,
  alt,
  width = 200,
  maxWidth = '100%',
  height = 'auto',
}: CollapsibleImageProps) {
  const [expanded, setExpanded] = useState(false)

  const handleToggle = (event: React.MouseEvent<HTMLParagraphElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setExpanded((prev) => !prev)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLParagraphElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.stopPropagation()
    setExpanded((prev) => !prev)
  }

  return (
    <Box>
      <Text
        w={maxWidth}
        display="inline-block"
        style={{ cursor: 'pointer', color: '#1971c2', userSelect: 'none', display: 'inline-block' }}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        size="xs"
      >
        {expanded ? 'Collapse -' : 'Expand +'}
      </Text>
      {expanded && (
        <Box mt="xxs" mb="xxs">
          <Image src={src} alt={alt} w={width} h={height} maw={maxWidth} />
        </Box>
      )}
    </Box>
  )
}
