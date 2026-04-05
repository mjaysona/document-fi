'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Group, Text } from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import classes from './page.module.scss'
import { Ban, PlusCircle, Upload } from 'lucide-react'
import { parseWeightBillOCR, type ParsedWeightBill } from '@/lib/parseWeightBillOCR'

export default function DropzoneButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const openRef = useRef<() => void>(null)
  const previewUrlsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const getAmountForVehicle = (vehicleType: string): number | undefined => {
    const vehicleAmountMap: Record<string, number> = {
      ELF: 100,
      FORWARD: 150,
      'TEN WHEELER': 250,
      'KOLONG-KOLONG': 100,
      'KONLONG-KOLONG': 100,
    }
    return vehicleAmountMap[vehicleType.toUpperCase()]
  }

  const handleDrop = async (droppedFiles: File[]) => {
    console.log('Dropped files:', droppedFiles)
    if (!droppedFiles.length) return

    setIsLoading(true)

    try {
      // Create FormData with actual files (no base64 conversion)
      const formData = new FormData()
      droppedFiles.forEach((file) => {
        formData.append('files', file)
      })

      // Send to Route Handler
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
        // Get the first upload's media ID to pass in query
        const firstUpload = result.data.uploads[0]
        const mediaId = typeof firstUpload.media === 'string' ? firstUpload.media : firstUpload.media?.id
        router.push(`/app/records/new/verify?id=${mediaId}`)
      } else {
        console.error('Failed to create session:', result.error)
      }
    } catch (error) {
      console.error('Error creating session:', error)
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

        {isLoading && <Text mt="md">Uploading files...</Text>}
      </Card>
    </div>
  )
}
