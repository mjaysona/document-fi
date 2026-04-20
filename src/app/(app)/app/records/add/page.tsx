'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import { Ban, CheckCircle, Trash2, Upload } from 'lucide-react'
import classes from '../page.module.scss'
import { parseWeightBillOCR, type ParsedWeightBill } from '@/lib/parseWeightBillOCR'
import UploadPagination from './UploadPagination'
import {
  getSessionUploads,
  getWeightBillForEdit,
  updateWeightBillById,
  verifyAndSaveWeightBill,
  saveWeightBill,
  saveWeightBillManual,
} from './actions'

type VehicleOption = {
  id: string
  name: string
  amount: number
}

type FileRecord = {
  id?: string
  fileName: string
  proofOfReceiptFileName: string
  proofOfReceiptMediaId?: string
  fileData: string // base64
  imagePreviewUrl: string
  sourceImageUrl: string
  parsedResult: ParsedWeightBill | null
  date: string
  customerName: string
  weightBillNumber: number | undefined
  vehicle: string
  amount: number | undefined
  paymentStatus: 'PAID' | 'CANCELLED' | ''
  analyzed: boolean
}

export default function VerifyPage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('editId') || searchParams.get('id')
  const isEditMode = pathname === '/app/records/edit' || Boolean(searchParams.get('editId'))
  const isManualMode = searchParams.get('manual') === 'true'
  const [records, setRecords] = useState<FileRecord[]>([])
  const [uploads, setUploads] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<VehicleOption[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isUploadingProof, setIsUploadingProof] = useState(false)
  const proofInputRef = useRef<HTMLInputElement | null>(null)

  const findVehicleByName = (
    vehicleName: string,
    vehicleOptions: VehicleOption[] = vehicles,
  ): VehicleOption | undefined => {
    return vehicleOptions.find((vehicleOption) => vehicleOption.name === vehicleName)
  }

  const getAmountForVehicle = (
    vehicleIdOrName: string,
    vehicleOptions: VehicleOption[] = vehicles,
  ): number | undefined => {
    const vehicleById = vehicleOptions.find((vehicleOption) => vehicleOption.id === vehicleIdOrName)

    if (vehicleById) {
      return vehicleById.amount
    }

    return findVehicleByName(vehicleIdOrName, vehicleOptions)?.amount
  }

  const analyzeRecord = async (
    record: FileRecord,
    index: number,
    vehicleOptions: VehicleOption[] = vehicles,
  ) => {
    if (!record || isLoading) return

    setIsAnalyzing(true)

    try {
      // Fetch image from URL and convert to base64
      let base64Image = record.fileData
      if (!base64Image && record.imagePreviewUrl) {
        const response = await fetch(record.imagePreviewUrl)
        if (!response.ok) throw new Error('Failed to fetch image')
        const blob = await response.blob()
        base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            const base64 = result.split(',')[1] ?? ''
            resolve(base64)
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      }

      const response = await fetch('/api/mistral-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'OCR API error')
      }

      console.log('Raw Weight Bill:', data.ocrResult)
      const parsed = parseWeightBillOCR(data.ocrResult)
      const matchedVehicle = findVehicleByName(parsed.vehicle, vehicleOptions)
      const amount = matchedVehicle?.amount ?? getAmountForVehicle(parsed.vehicle, vehicleOptions)

      setRecords((prev) =>
        prev.map((item, idx) =>
          idx === index
            ? {
                ...item,
                parsedResult: parsed,
                date: parsed.date,
                customerName: parsed.customer,
                weightBillNumber: parsed.weightBillNumber
                  ? Number(parsed.weightBillNumber)
                  : undefined,
                vehicle: matchedVehicle?.id || item.vehicle,
                amount: amount ?? item.amount,
                analyzed: true,
              }
            : item,
        ),
      )

      console.log('Parsed Weight Bill:', parsed)
    } catch (error) {
      console.error('OCR integration error:', error)
      setRecords((prev) =>
        prev.map((item, idx) =>
          idx === index ? { ...item, parsedResult: null, analyzed: true } : item,
        ),
      )
    } finally {
      setIsAnalyzing(false)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsFetching(true)
      try {
        if (isEditMode && editId) {
          const editResult = await getWeightBillForEdit(editId)

          if (!editResult.success || !editResult.data) {
            router.push('/app/records/weight-bills')
            return
          }

          setVehicles(editResult.data.vehicles)
          setRecords([
            { ...editResult.data.record, sourceImageUrl: editResult.data.record.imagePreviewUrl },
          ])
          setUploads([{ savedStatus: editResult.data.record.paymentStatus ? 'saved' : 'unsaved' }])
          setActiveIndex(0)

          return
        }

        if (isManualMode) {
          const manualResult = await getSessionUploads()
          if (!manualResult.success || !manualResult.data) {
            router.push('/app/records/new')
            return
          }

          setVehicles(manualResult.data.vehicles)
          setRecords([
            {
              id: 'manual',
              fileName: 'Manual entry',
              proofOfReceiptFileName: '',
              proofOfReceiptMediaId: undefined,
              fileData: '',
              imagePreviewUrl: '',
              sourceImageUrl: '',
              parsedResult: null,
              date: '',
              customerName: '',
              weightBillNumber: undefined,
              vehicle: '',
              amount: undefined,
              paymentStatus: '',
              analyzed: true,
            },
          ])
          setUploads([{ savedStatus: 'unsaved' }])
          setActiveIndex(0)
          return
        }

        const result = await getSessionUploads()
        if (!result.success || !result.data) {
          router.push('/app/records/new')
          return
        }
        const { session: sessionData, vehicles: vehicleOptions } = result.data
        setVehicles(vehicleOptions)

        if (!sessionData) {
          router.push('/app/records/new')
          return
        }

        const uploadsData = sessionData.uploads || []

        // Preserve analyzed data from existing records
        const recordsMap = new Map(records.map((r, idx) => [idx, r]))

        const newRecords: FileRecord[] = uploadsData.map((upload: any, idx: number) => {
          const media = upload.media
          const mediaUrl = typeof media === 'string' ? `/api/media/${media}` : media?.url || ''

          // Reuse existing record if it exists to preserve analyzed state
          const existingRecord = recordsMap.get(idx)
          if (existingRecord) {
            return { ...existingRecord, imagePreviewUrl: mediaUrl }
          }

          return {
            id: `${sessionData.id}-${idx}`,
            fileName: upload.fileName,
            proofOfReceiptFileName: upload.fileName,
            proofOfReceiptMediaId:
              typeof media === 'string' ? media : media?.id ? String(media.id) : undefined,
            fileData: '', // Not needed anymore
            imagePreviewUrl: mediaUrl,
            sourceImageUrl: mediaUrl,
            parsedResult: null,
            date: '',
            customerName: '',
            weightBillNumber: undefined,
            vehicle: '',
            amount: undefined,
            paymentStatus: '',
            analyzed: false,
          }
        })
        setRecords(newRecords)
        setUploads(uploadsData)

        // Find the index based on id query param
        const id = searchParams.get('id')
        let initialIndex = 0
        if (id) {
          const foundIndex = uploadsData.findIndex((upload: any) => {
            const mediaId = typeof upload.media === 'string' ? upload.media : upload.media?.id
            return mediaId === id
          })
          initialIndex = foundIndex !== -1 ? foundIndex : 0
        }

        setActiveIndex(initialIndex)
      } catch (error) {
        console.error('Failed to load verify data:', error)
        router.push(isEditMode ? '/app/records/weight-bills' : '/app/records/new')
      } finally {
        setIsFetching(false)
      }
    }
    loadData()
  }, [router, searchParams, editId, isEditMode, isManualMode])

  const currentRecord = records[activeIndex]

  // Auto-analyze when a new unanalyzed record becomes active (e.g. after Upload and Analyze)
  useEffect(() => {
    if (
      !currentRecord ||
      currentRecord.analyzed ||
      !currentRecord.imagePreviewUrl ||
      isAnalyzing ||
      isLoading ||
      isEditMode ||
      isManualMode
    )
      return
    analyzeRecord(currentRecord, activeIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRecord?.id, activeIndex])

  const canGoPrev = activeIndex > 0
  const canGoNext = activeIndex < records.length - 1
  const allSaved =
    uploads.length > 0 &&
    uploads.every((u) => u.savedStatus === 'saved' || u.savedStatus === 'verified')
  const isFormDisabled = isLoading || isFetching || isUploadingProof || isAnalyzing

  const updateActiveRecord = (updates: Partial<FileRecord>) => {
    setRecords((prev) =>
      prev.map((record, idx) => (idx === activeIndex ? { ...record, ...updates } : record)),
    )
  }

  const goToIndex = async (index: number) => {
    if (isEditMode) return
    if (index < 0 || index >= records.length) return
    setActiveIndex(index)

    // Update URL with the media ID of the new upload
    const upload = uploads[index]
    if (upload) {
      const mediaId = typeof upload.media === 'string' ? upload.media : upload.media?.id
      if (mediaId) {
        window.history.replaceState({}, '', `/app/records/add?id=${mediaId}`)
      }
    }
  }

  const handleVehicleChange = (value: string) => {
    const vehicleId = value || ''
    const amount = getAmountForVehicle(vehicleId)
    updateActiveRecord({ vehicle: vehicleId, amount: amount ?? currentRecord?.amount })
  }

  const handleSkip = async () => {
    console.log('Skip clicked for', currentRecord?.fileName)
    if (canGoNext) {
      await goToIndex(activeIndex + 1)
    }
  }

  const handleBack = async () => {
    if (canGoPrev) {
      await goToIndex(activeIndex - 1)
    }
  }

  const handleProofOfReceiptSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = event.currentTarget
    const selectedFile = inputEl.files?.[0]
    if (!selectedFile) return
    await handleProofOfReceiptUpload(selectedFile)
    inputEl.value = ''
  }

  const handleProofOfReceiptUpload = async (selectedFile: File) => {
    if (!selectedFile || !currentRecord) return

    setIsUploadingProof(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result?.success || !result?.data?.id) {
        throw new Error(result?.error || 'Failed to upload proof of receipt')
      }

      updateActiveRecord({
        proofOfReceiptMediaId: String(result.data.id),
        proofOfReceiptFileName: result.data.fileName || selectedFile.name,
        imagePreviewUrl: result.data.url || '',
        analyzed: false,
      })
    } catch (error) {
      console.error('Proof of receipt upload failed:', error)
    } finally {
      setIsUploadingProof(false)
    }
  }

  const handleAnalyzeCurrent = async () => {
    if (!currentRecord?.imagePreviewUrl || isUploadingProof || isLoading) return
    await analyzeRecord(currentRecord, activeIndex)
  }

  const handleRemoveAttachedImage = () => {
    if (!currentRecord) return
    updateActiveRecord({
      proofOfReceiptMediaId: undefined,
      proofOfReceiptFileName: currentRecord.sourceImageUrl ? currentRecord.fileName : '',
      imagePreviewUrl: currentRecord.sourceImageUrl,
      analyzed: false,
    })
  }

  const handleSave = async () => {
    if (!currentRecord) return

    setIsLoading(true)
    try {
      if (isEditMode && editId) {
        const result = await updateWeightBillById(
          editId,
          {
            date: currentRecord.date,
            customerName: currentRecord.customerName,
            weightBillNumber: currentRecord.weightBillNumber,
            vehicle: currentRecord.vehicle,
            amount: currentRecord.amount,
            paymentStatus: currentRecord.paymentStatus || undefined,
            proofOfReceipt: currentRecord.proofOfReceiptMediaId || undefined,
          },
          false,
        )

        if (result.success) {
          setUploads([{ savedStatus: 'saved' }])
        } else {
          console.error('Save failed:', result.error)
        }

        setIsLoading(false)
        return
      }

      const result = isManualMode
        ? await saveWeightBillManual(
            {
              date: currentRecord.date,
              customerName: currentRecord.customerName,
              weightBillNumber: currentRecord.weightBillNumber,
              vehicle: currentRecord.vehicle,
              amount: currentRecord.amount,
              paymentStatus: currentRecord.paymentStatus || undefined,
              proofOfReceipt: currentRecord.proofOfReceiptMediaId || undefined,
            },
            false,
          )
        : await saveWeightBill(
            activeIndex,
            {
              date: currentRecord.date,
              customerName: currentRecord.customerName,
              weightBillNumber: currentRecord.weightBillNumber,
              vehicle: currentRecord.vehicle,
              amount: currentRecord.amount,
              paymentStatus: currentRecord.paymentStatus || undefined,
              proofOfReceipt: currentRecord.proofOfReceiptMediaId || undefined,
            },
            currentRecord.fileName,
            false,
          )
      if (result.success) {
        // Update uploads with saved status
        setUploads((prev) =>
          prev.map((u, idx) => (idx === activeIndex ? { ...u, savedStatus: 'saved' } : u)),
        )

        // Auto-advance after saving
        setTimeout(() => {
          const nextUnsavedIndex = uploads.findIndex(
            (u, idx) => idx > activeIndex && (!u.savedStatus || u.savedStatus === 'unsaved'),
          )
          if (nextUnsavedIndex !== -1) {
            const upload = uploads[nextUnsavedIndex]
            const mediaId = typeof upload.media === 'string' ? upload.media : upload.media?.id
            if (mediaId) {
              window.history.replaceState({}, '', `/app/records/add?id=${mediaId}`)
            }
            setActiveIndex(nextUnsavedIndex)
          } else if (canGoNext) {
            const nextUpload = uploads[activeIndex + 1]
            const mediaId =
              typeof nextUpload.media === 'string' ? nextUpload.media : nextUpload.media?.id
            if (mediaId) {
              window.history.replaceState({}, '', `/app/records/add?id=${mediaId}`)
            }
            setActiveIndex(activeIndex + 1)
          }
          setIsLoading(false)
        }, 500)
        return
      } else {
        console.error('Save failed:', result.error)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Save failed:', error)
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!currentRecord) return

    setIsLoading(true)
    try {
      if (isEditMode && editId) {
        const result = await updateWeightBillById(
          editId,
          {
            date: currentRecord.date,
            customerName: currentRecord.customerName,
            weightBillNumber: currentRecord.weightBillNumber,
            vehicle: currentRecord.vehicle,
            amount: currentRecord.amount,
            paymentStatus: currentRecord.paymentStatus || undefined,
            proofOfReceipt: currentRecord.proofOfReceiptMediaId || undefined,
          },
          true,
        )

        if (result.success) {
          setUploads([{ savedStatus: 'verified' }])
        } else {
          console.error('Verify failed:', result.error)
        }

        setIsLoading(false)
        return
      }

      const result = isManualMode
        ? await saveWeightBillManual(
            {
              date: currentRecord.date,
              customerName: currentRecord.customerName,
              weightBillNumber: currentRecord.weightBillNumber,
              vehicle: currentRecord.vehicle,
              amount: currentRecord.amount,
              paymentStatus: currentRecord.paymentStatus || undefined,
              proofOfReceipt: currentRecord.proofOfReceiptMediaId || undefined,
            },
            true,
          )
        : await verifyAndSaveWeightBill(
            activeIndex,
            {
              date: currentRecord.date,
              customerName: currentRecord.customerName,
              weightBillNumber: currentRecord.weightBillNumber,
              vehicle: currentRecord.vehicle,
              amount: currentRecord.amount,
              paymentStatus: currentRecord.paymentStatus || undefined,
              proofOfReceipt: currentRecord.proofOfReceiptMediaId || undefined,
            },
            currentRecord.fileName,
          )
      if (result.success) {
        // Update uploads with verified status
        setUploads((prev) =>
          prev.map((u, idx) => (idx === activeIndex ? { ...u, savedStatus: 'verified' } : u)),
        )

        // Auto-advance after verifying
        setTimeout(() => {
          const nextUnsavedIndex = uploads.findIndex(
            (u, idx) => idx > activeIndex && (!u.savedStatus || u.savedStatus === 'unsaved'),
          )
          if (nextUnsavedIndex !== -1) {
            const upload = uploads[nextUnsavedIndex]
            const mediaId = typeof upload.media === 'string' ? upload.media : upload.media?.id
            if (mediaId) {
              window.history.replaceState({}, '', `/app/records/add?id=${mediaId}`)
            }
            setActiveIndex(nextUnsavedIndex)
          } else if (canGoNext) {
            const nextUpload = uploads[activeIndex + 1]
            const mediaId =
              typeof nextUpload.media === 'string' ? nextUpload.media : nextUpload.media?.id
            if (mediaId) {
              window.history.replaceState({}, '', `/app/records/add?id=${mediaId}`)
            }
            setActiveIndex(activeIndex + 1)
          }
          setIsLoading(false)
        }, 500)
        return
      } else {
        console.error('Verify failed:', result.error)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Verify failed:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className={classes.wrapper}>
      <div className={classes.card} style={{ flex: 1 }}>
        {currentRecord &&
          uploads[activeIndex] &&
          uploads[activeIndex].savedStatus &&
          uploads[activeIndex].savedStatus !== 'unsaved' && (
            <Alert
              title={
                uploads[activeIndex].savedStatus === 'verified'
                  ? uploads?.length > 1
                    ? 'Already Verified'
                    : 'Verified successfully'
                  : uploads?.length > 1
                    ? 'Already Saved'
                    : 'Saved successfully'
              }
              color={uploads?.length > 1 ? 'blue' : 'green'}
              mb="md"
            >
              Saving or verifying again will overwrite the previous entry.
            </Alert>
          )}

        {isLoading && <Text mt="md">Processing...</Text>}

        <Group grow align="flex-start" wrap="nowrap" gap="md">
          {currentRecord && (
            <Card withBorder radius="md" style={{ flex: 1 }}>
              <Text fw={700} mb="md">
                Weight Bill Form
              </Text>
              <div style={{ display: 'grid', gap: 16 }}>
                <TextInput
                  label="Date"
                  type="date"
                  value={currentRecord.date}
                  onChange={(e) => updateActiveRecord({ date: e.currentTarget.value })}
                  disabled={isFormDisabled}
                />
                <TextInput
                  label="Customer Name"
                  value={currentRecord.customerName}
                  onChange={(e) => updateActiveRecord({ customerName: e.currentTarget.value })}
                  disabled={isFormDisabled}
                />
                <NumberInput
                  label="Weight Bill #"
                  value={currentRecord.weightBillNumber}
                  onChange={(val) =>
                    updateActiveRecord({
                      weightBillNumber: typeof val === 'number' ? val : undefined,
                    })
                  }
                  min={0}
                  disabled={isFormDisabled}
                />
                <Select
                  label="Vehicle"
                  value={currentRecord.vehicle || undefined}
                  onChange={(value) => handleVehicleChange(value || '')}
                  data={vehicles.map((vehicleOption) => ({
                    value: vehicleOption.id,
                    label: vehicleOption.name,
                  }))}
                  clearable
                  placeholder="Select vehicle"
                  disabled={isFormDisabled}
                />
                <NumberInput
                  label="Amount"
                  value={currentRecord.amount}
                  onChange={(val) =>
                    updateActiveRecord({ amount: typeof val === 'number' ? val : undefined })
                  }
                  min={0}
                  disabled={isFormDisabled}
                />
                <Select
                  label="Payment Status"
                  value={currentRecord.paymentStatus || undefined}
                  onChange={(value) =>
                    updateActiveRecord({ paymentStatus: (value as 'PAID' | 'CANCELLED') || '' })
                  }
                  data={[
                    { value: 'PAID', label: 'PAID' },
                    { value: 'CANCELLED', label: 'CANCELLED' },
                  ]}
                  clearable
                  placeholder="Select payment status"
                  disabled={isFormDisabled}
                />
                <Group justify="end" mt="md">
                  <Button variant="outline" onClick={handleSave} disabled={isFormDisabled}>
                    SAVE
                  </Button>
                  <Button onClick={handleVerify} disabled={isFormDisabled}>
                    VERIFY
                  </Button>
                </Group>
              </div>
            </Card>
          )}

          {currentRecord && (
            <div style={{ minWidth: 320 }}>
              <input
                ref={proofInputRef}
                type="file"
                hidden
                accept="image/*,.pdf"
                onChange={handleProofOfReceiptSelect}
              />

              <Button
                onClick={handleAnalyzeCurrent}
                disabled={!currentRecord.imagePreviewUrl || isFormDisabled || isAnalyzing}
                loading={isAnalyzing}
                fullWidth
                mb="md"
              >
                {isAnalyzing ? 'ANALYZING' : 'ANALYZE'}
              </Button>

              {!currentRecord.imagePreviewUrl ? (
                <Card withBorder radius="md" className={classes.uploadCard}>
                  <Dropzone
                    className={classes.dropzone}
                    radius="md"
                    onDrop={(files) => {
                      const file = files[0]
                      if (file) {
                        void handleProofOfReceiptUpload(file)
                      }
                    }}
                    disabled={isFormDisabled}
                    maxSize={30 * 1024 ** 2}
                    accept={[MIME_TYPES.pdf, MIME_TYPES.jpeg, MIME_TYPES.png]}
                    aria-label="Drop receipt here"
                  >
                    <div style={{ pointerEvents: 'none' }}>
                      <Group justify="center">
                        <Dropzone.Accept>
                          <CheckCircle size={50} className={classes.icon} />
                        </Dropzone.Accept>
                        <Dropzone.Reject>
                          <Ban size={50} className={classes.icon} />
                        </Dropzone.Reject>
                        <Dropzone.Idle>
                          <Upload size={50} className={classes.icon} />
                        </Dropzone.Idle>
                      </Group>

                      <Text ta="center" fw={700} fz="lg" mt="xl">
                        <Dropzone.Accept>Drop receipt here</Dropzone.Accept>
                        <Dropzone.Reject>File is invalid</Dropzone.Reject>
                        <Dropzone.Idle>Upload proof of receipt</Dropzone.Idle>
                      </Text>

                      <Text className={classes.description}>
                        Drag & drop an image or PDF here, or click to select a file.
                      </Text>
                    </div>
                  </Dropzone>
                </Card>
              ) : (
                <Card withBorder radius="md">
                  <Group justify="space-between" align="center" mb="md">
                    <Text fw={700}>
                      Image preview (
                      {currentRecord.proofOfReceiptFileName || currentRecord.fileName})
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={handleRemoveAttachedImage}
                      disabled={isFormDisabled}
                      aria-label="Remove attached image"
                    >
                      <Trash2 size={14} />
                    </ActionIcon>
                  </Group>
                  <div
                    onClick={() => proofInputRef.current?.click()}
                    style={{
                      cursor: 'pointer',
                      position: 'relative',
                      width: '100%',
                      maxHeight: '400px',
                      overflow: 'auto',
                    }}
                  >
                    <img
                      src={currentRecord.imagePreviewUrl}
                      alt="Receipt preview"
                      style={{
                        width: '100%',
                        height: 'auto',
                        objectFit: 'contain',
                        marginTop: 8,
                        borderRadius: 4,
                        opacity: 0.9,
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.9')}
                    />
                  </div>
                </Card>
              )}
            </div>
          )}
        </Group>
      </div>
      {currentRecord && uploads.length > 1 && (
        <Card withBorder radius="md" className={classes['footer--fixed']}>
          <Group justify="space-between">
            <div className={classes.footer__items}>
              <UploadPagination
                uploads={uploads}
                activeIndex={activeIndex}
                onPageChange={goToIndex}
                disabled={isEditMode || isFormDisabled}
              />
            </div>
            <div className={classes.footer__actions}>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isEditMode || !canGoPrev || isFormDisabled}
              >
                BACK
              </Button>
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={isEditMode || !canGoNext || isFormDisabled}
              >
                NEXT
              </Button>
              <Tooltip
                label="Save or verify all items before finishing"
                disabled={allSaved || isFormDisabled}
              >
                <Button
                  variant="filled"
                  onClick={handleSkip}
                  disabled={isEditMode || !allSaved || isFormDisabled}
                >
                  FINISH
                </Button>
              </Tooltip>
            </div>
          </Group>
        </Card>
      )}
    </div>
  )
}
