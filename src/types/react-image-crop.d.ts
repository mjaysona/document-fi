declare module 'react-image-crop' {
  import * as React from 'react'

  export type Crop = {
    x: number
    y: number
    width: number
    height: number
    unit: 'px' | '%'
  }

  export type ReactCropProps = {
    crop?: Crop
    onChange?: (crop: Crop, percentCrop: Crop) => void
    onComplete?: (crop: Crop, percentCrop: Crop) => void
    aspect?: number
    keepSelection?: boolean
    children?: React.ReactNode
    style?: React.CSSProperties
  }

  const ReactCrop: React.ComponentType<ReactCropProps>
  export default ReactCrop
}
