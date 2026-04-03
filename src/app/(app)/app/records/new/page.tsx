'use client'

import { useRef, useState } from 'react'
import { Button, Card, Group, Text } from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import classes from './page.module.scss'
import { Ban, PlusCircle, Upload } from 'lucide-react'

export default function DropzoneButton() {
  const [files, setFiles] = useState<File[]>([])
  const [ocrResult, setOcrResult] = useState<string>('')
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const openRef = useRef<() => void>(null)

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1] ?? ''
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleDrop = async (droppedFiles: File[]) => {
    console.log('Dropped files:', droppedFiles)
    if (!droppedFiles.length) return

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    setFiles(droppedFiles)
    setImagePreviewUrl(URL.createObjectURL(droppedFiles[0]))
    setIsLoading(true)
    try {
      const base64 = await toBase64(droppedFiles[0])
      const response = await fetch('/api/mistral-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image: base64 }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'OCR API error')
      }

      setOcrResult(JSON.stringify(data.ocrResult, null, 2))
      console.log('Mistral OCR response:', data)
    } catch (error) {
      console.error('OCR integration error:', error)
      setOcrResult('OCR error: ' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={classes.wrapper}>
      <Card withBorder radius="md" className={classes.card}>
        <Dropzone
          openRef={openRef}
          onDrop={handleDrop}
          className={classes.dropzone}
          radius="md"
          accept={[MIME_TYPES.pdf, MIME_TYPES.jpeg, MIME_TYPES.png]}
          maxSize={30 * 1024 ** 2}
          aria-label="Drop files here"
        >
          <div style={{ pointerEvents: 'none' }}>
            <Group justify="center">
              <Dropzone.Accept>
                <PlusCircle size={50} />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <Ban size={50} />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <Upload size={50} />
              </Dropzone.Idle>
            </Group>

            <Text ta="center" fw={700} fz="lg" mt="xl">
              <Dropzone.Accept>Drop files here</Dropzone.Accept>
              <Dropzone.Reject>File is invalid</Dropzone.Reject>
              <Dropzone.Idle>Upload</Dropzone.Idle>
            </Text>

            <Text className={classes.description}>
              Drag&apos;n&apos;drop files here to upload. We can accept only <i>.pdf</i> files that
              are less than 30mb in size.
            </Text>
          </div>
        </Dropzone>
        <Button
          className={classes.control}
          size="md"
          radius="xl"
          onClick={() => openRef.current?.()}
        >
          Select files
        </Button>

        {isLoading && <Text mt="md">Analyzing image with Mistral OCR...</Text>}
        {imagePreviewUrl && (
          <Card withBorder radius="md" mt="md" style={{ maxWidth: 500 }}>
            <Text fw={700}>Image preview</Text>
            <img
              src={imagePreviewUrl}
              alt="Dropped file preview"
              style={{ width: '100%', height: 'auto', objectFit: 'contain', marginTop: 8 }}
            />
          </Card>
        )}
        {ocrResult && (
          <Card withBorder radius="md" mt="md" style={{ whiteSpace: 'pre-wrap' }}>
            <Text fw={700}>OCR result</Text>
            <Text fz="sm">{ocrResult}</Text>
          </Card>
        )}
      </Card>
    </div>
  )
}
