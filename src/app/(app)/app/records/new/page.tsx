'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Group, Text } from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import classes from './page.module.scss'
import { Ban, CheckCircle, PencilLine, PlusCircle, Upload } from 'lucide-react'

export default function DropzoneButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [droppedFiles, setDroppedFiles] = useState<File[]>([])
  const openRef = useRef<() => void>(null)

  const handleDrop = (files: File[]) => {
    if (!files.length) return
    setDroppedFiles(files)
  }

  const handleUploadAndAnalyze = async () => {
    if (!droppedFiles.length) return

    setIsLoading(true)

    try {
      const formData = new FormData()
      droppedFiles.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch('/api/session-uploads/create', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create session')
      }

      const result = await response.json()

      if (result.success) {
        const firstUpload = result.data.uploads[0]
        const mediaId =
          typeof firstUpload.media === 'string' ? firstUpload.media : firstUpload.media?.id
        router.push(`/app/records/add?id=${mediaId}`)
      } else {
        console.error('Failed to create session:', result.error)
      }
    } catch (error) {
      console.error('Error creating session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnterManually = async () => {
    setIsLoading(true)

    try {
      await fetch('/api/session-uploads/reset', { method: 'POST' })
    } catch (error) {
      console.error('Error resetting session upload:', error)
    } finally {
      router.push('/app/records/add?manual=true')
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
          disabled={isLoading}
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
                {droppedFiles.length ? <CheckCircle size={50} /> : <Upload size={50} />}
              </Dropzone.Idle>
            </Group>

            <Text ta="center" fw={700} fz="lg" mt="xl">
              <Dropzone.Accept>Drop files here</Dropzone.Accept>
              <Dropzone.Reject>File is invalid</Dropzone.Reject>
              <Dropzone.Idle>
                {droppedFiles.length === 0
                  ? 'Upload proof of receipt'
                  : droppedFiles.length === 1
                    ? droppedFiles[0]?.name
                    : `${droppedFiles.length} files selected`}
              </Dropzone.Idle>
            </Text>

            <Text className={classes.description}>
              {droppedFiles.length
                ? 'Files ready. Click "Upload and analyze?" to extract data via OCR, or enter details manually.'
                : 'Drag & drop an image or PDF here, or click to select a file.'}
            </Text>
          </div>
        </Dropzone>

        <Group mt="md" justify="center" gap="sm">
          <Button
            className={classes.control}
            size="md"
            radius="xl"
            leftSection={<PlusCircle size={16} />}
            onClick={droppedFiles.length ? handleUploadAndAnalyze : () => openRef.current?.()}
            loading={droppedFiles.length > 0 && isLoading}
            disabled={droppedFiles.length === 0 && isLoading}
          >
            {droppedFiles.length ? 'Upload and analyze?' : 'Select file'}
          </Button>

          <Button
            size="md"
            radius="xl"
            variant="subtle"
            leftSection={<PencilLine size={16} />}
            onClick={handleEnterManually}
            disabled={isLoading}
          >
            Enter manually
          </Button>
        </Group>
      </Card>
    </div>
  )
}
