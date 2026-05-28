// Utility to crop an image using canvas and return a File
export default async function getCroppedImg(imageSrc: string, crop: any): Promise<File> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = crop.width
  canvas.height = crop.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2d context')
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas is empty'))
      const file = new File([blob], 'cropped-logo.png', { type: 'image/png' })
      resolve(file)
    }, 'image/png')
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', (err) => reject(err))
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}
