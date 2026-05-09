'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Alert, Button, Card, Group, NumberInput, Select, Text, TextInput } from '@mantine/core'
import classes from '../page.module.scss'
import { parseWeightBillOCR, type ParsedWeightBill } from '@/lib/parseWeightBillOCR'
import {
  getSessionUploads,
  getWeightBillForEdit,
  updateWeightBillById,
  verifyAndSaveWeightBill,
  saveWeightBill,
} from './actions'

type VehicleOption = {
  id: string
  name: string
  amount: number
}

type FileRecord = {
  id?: string
  fileName: string
  fileData: string // base64
  imagePreviewUrl: string
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
  const isEditMode =
    pathname === '/app/records/weight-bills/edit' || Boolean(searchParams.get('editId'))
  const [records, setRecords] = useState<FileRecord[]>([])
  const [uploads, setUploads] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<VehicleOption[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

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
    if (!record || record.analyzed || isLoading) return

    setIsLoading(true)

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
    } catch (error) {
      console.error('OCR integration error:', error)
      setRecords((prev) =>
        prev.map((item, idx) =>
          idx === index ? { ...item, parsedResult: null, analyzed: true } : item,
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        if (isEditMode && editId) {
          const editResult = await getWeightBillForEdit(editId)

          if (!editResult.success || !editResult.data) {
            router.push('/app/records/weight-bills')
            return
          }

          setVehicles(editResult.data.vehicles)
          setRecords([editResult.data.record])
          setUploads([{ savedStatus: editResult.data.record.paymentStatus ? 'saved' : 'unsaved' }])
          setActiveIndex(0)

          return
        }

        const result = await getSessionUploads()
        if (!result.success || !result.data) {
          router.push('/app/records/weight-bills/new')
          return
        }
        const { session: sessionData, vehicles: vehicleOptions } = result.data
        setVehicles(vehicleOptions)

        if (!sessionData) {
          router.push('/app/records/weight-bills/new')
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
            fileData: '', // Not needed anymore
            imagePreviewUrl: mediaUrl,
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
        // Only analyze if not already analyzed
        if (newRecords[initialIndex] && !newRecords[initialIndex].analyzed) {
          await analyzeRecord(newRecords[initialIndex], initialIndex, vehicleOptions)
        }
      } catch (error) {
        console.error('Failed to load verify data:', error)
        router.push(isEditMode ? '/app/records/weight-bills' : '/app/records/weight-bills/new')
      }
    }
    loadData()
  }, [router, searchParams, editId, isEditMode])

  const currentRecord = records[activeIndex]
  const canGoPrev = activeIndex > 0
  const canGoNext = activeIndex < records.length - 1
  const isFormDisabled = isLoading

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
        window.history.replaceState({}, '', `/app/records/weight-bills/add?id=${mediaId}`)
      }
    }

    if (!records[index]?.analyzed) {
      await analyzeRecord(records[index], index)
    }
  }

  const handleVehicleChange = (value: string) => {
    const vehicleId = value || ''
    const amount = getAmountForVehicle(vehicleId)
    updateActiveRecord({ vehicle: vehicleId, amount: amount ?? currentRecord?.amount })
  }

  const handleSkip = async () => {
    if (canGoNext) {
      await goToIndex(activeIndex + 1)
    }
  }

  const handleBack = async () => {
    if (canGoPrev) {
      await goToIndex(activeIndex - 1)
    }
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
          },
          false,
        )

        if (result.success) {
          setUploads([{ savedStatus: 'saved' }])
        } else {
          console.error('Save failed:', result.error)
        }

        return
      }

      const result = await saveWeightBill(
        activeIndex,
        {
          date: currentRecord.date,
          customerName: currentRecord.customerName,
          weightBillNumber: currentRecord.weightBillNumber,
          vehicle: currentRecord.vehicle,
          amount: currentRecord.amount,
          paymentStatus: currentRecord.paymentStatus || undefined,
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
              window.history.replaceState({}, '', `/app/records/weight-bills/add?id=${mediaId}`)
            }
            setActiveIndex(nextUnsavedIndex)
          } else if (canGoNext) {
            const nextUpload = uploads[activeIndex + 1]
            const mediaId =
              typeof nextUpload.media === 'string' ? nextUpload.media : nextUpload.media?.id
            if (mediaId) {
              window.history.replaceState({}, '', `/app/records/weight-bills/add?id=${mediaId}`)
            }
            setActiveIndex(activeIndex + 1)
          }
        }, 500)
      } else {
        console.error('Save failed:', result.error)
      }
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
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
          },
          true,
        )

        if (result.success) {
          setUploads([{ savedStatus: 'verified' }])
        } else {
          console.error('Verify failed:', result.error)
        }

        return
      }

      const result = await verifyAndSaveWeightBill(
        activeIndex,
        {
          date: currentRecord.date,
          customerName: currentRecord.customerName,
          weightBillNumber: currentRecord.weightBillNumber,
          vehicle: currentRecord.vehicle,
          amount: currentRecord.amount,
          paymentStatus: currentRecord.paymentStatus || undefined,
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
              window.history.replaceState({}, '', `/app/records/weight-bills/add?id=${mediaId}`)
            }
            setActiveIndex(nextUnsavedIndex)
          } else if (canGoNext) {
            const nextUpload = uploads[activeIndex + 1]
            const mediaId =
              typeof nextUpload.media === 'string' ? nextUpload.media : nextUpload.media?.id
            if (mediaId) {
              window.history.replaceState({}, '', `/app/records/weight-bills/add?id=${mediaId}`)
            }
            setActiveIndex(activeIndex + 1)
          }
        }, 500)
      } else {
        console.error('Verify failed:', result.error)
      }
    } catch (error) {
      console.error('Verify failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={classes.wrapper}>
      <Card withBorder radius="md" className={classes.card}>
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

        {isLoading && (
          <Text mt="md">
            {isEditMode ? 'Saving changes...' : 'Analyzing image with Mistral OCR...'}
          </Text>
        )}

        <Group grow align="flex-start" wrap="nowrap">
          {currentRecord?.imagePreviewUrl && (
            <div>
              <Text fw={700}>Image preview ({currentRecord.fileName})</Text>
              <img
                src={currentRecord.imagePreviewUrl}
                alt="Dropped file preview"
                style={{ width: '100%', height: 'auto', objectFit: 'contain', marginTop: 8 }}
              />
            </div>
          )}

          {currentRecord && (
            <div style={{ flex: 1 }}>
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
                <Group justify="apart" mt="md">
                  <Group>
                    <Button
                      variant="outline"
                      color="gray"
                      onClick={handleBack}
                      disabled={isEditMode || !canGoPrev || isFormDisabled}
                    >
                      BACK
                    </Button>
                  </Group>
                  <Group>
                    <Button
                      variant="outline"
                      color="gray"
                      onClick={handleSkip}
                      disabled={isEditMode || !canGoNext || isFormDisabled}
                    >
                      NEXT
                    </Button>
                    <Button variant="outline" onClick={handleSave} disabled={isFormDisabled}>
                      SAVE
                    </Button>
                    <Button onClick={handleVerify} disabled={isFormDisabled}>
                      VERIFY
                    </Button>
                  </Group>
                </Group>
              </div>
            </div>
          )}
        </Group>
      </Card>
    </div>
  )
}
