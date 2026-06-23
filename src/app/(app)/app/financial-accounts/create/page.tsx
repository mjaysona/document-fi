'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Alert,
  Button,
  Box,
  Fieldset,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Grid,
  Card,
  Image,
} from '@mantine/core'
import { Dropzone } from '@mantine/dropzone'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Modal } from '@mantine/core'
import getCroppedImg from './utils/cropImage'
// Utility to crop image using canvas and return a File
// (see ./utils/cropImage.ts for implementation)
import {
  createFinancialAccount,
  getBanksOptions,
  getFinancialAccountById,
  type BankOption,
  updateFinancialAccount,
} from '../actions'
import { Ban, CheckCircle, Upload } from 'lucide-react'

type Feedback = { type: 'success' | 'error'; message: string }

type Crop = {
  x: number
  y: number
  width: number
  height: number
  unit: 'px' | '%'
}

type LogoKind = 'primary' | 'brandmark'

const LOGO_ACCEPT_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const LOGO_MAX_SIZE_BYTES = 5 * 1024 ** 2

export default function FinancialAccountCreatePage() {
  // Crop aspect ratio state
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined)
  // Crop modal state (must be inside component)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropKind, setCropKind] = useState<LogoKind>('primary')
  const [crop, setCrop] = useState<Crop | undefined>()
  const [completedCrop, setCompletedCrop] = useState<Crop | undefined>()
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const isEditMode = pathname.endsWith('/financial-accounts/edit')
  const editId = searchParams.get('id') || ''

  const [banks, setBanks] = useState<BankOption[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(isEditMode))
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const [name, setName] = useState('')
  const [bankId, setBankId] = useState<string | null>(null)
  const [startingBalance, setStartingBalance] = useState<number | string>('')
  const [currentBalance, setCurrentBalance] = useState<number | string>('')
  const [primaryLogoId, setPrimaryLogoId] = useState('')
  const [primaryLogoUrl, setPrimaryLogoUrl] = useState('')
  const [primaryLogoFileName, setPrimaryLogoFileName] = useState('')
  const [primaryLogoFile, setPrimaryLogoFile] = useState<File | null>(null)
  const [brandmarkLogoId, setBrandmarkLogoId] = useState('')
  const [brandmarkLogoUrl, setBrandmarkLogoUrl] = useState('')
  const [brandmarkLogoFileName, setBrandmarkLogoFileName] = useState('')
  const [brandmarkLogoFile, setBrandmarkLogoFile] = useState<File | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [bankError, setBankError] = useState<string | null>(null)
  const [startingBalanceError, setStartingBalanceError] = useState<string | null>(null)
  const [currentBalanceError, setCurrentBalanceError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const banksResult = await getBanksOptions()
      if (banksResult.success) {
        setBanks(banksResult.data)
      }

      if (!isEditMode) {
        setIsLoading(false)
        return
      }

      if (!editId) {
        setFeedback({ type: 'error', message: 'Missing financial account id.' })
        setIsLoading(false)
        return
      }

      const accountResult = await getFinancialAccountById(editId)
      if (!accountResult.success || !accountResult.data) {
        setFeedback({
          type: 'error',
          message: accountResult.error || 'Failed to load financial account.',
        })
        setIsLoading(false)
        return
      }

      setName(accountResult.data.name)
      setBankId(accountResult.data.bankId)
      setStartingBalance(accountResult.data.startingBalance)
      setCurrentBalance(accountResult.data.currentBalance)
      setPrimaryLogoId(accountResult.data.primaryLogoId || '')
      setPrimaryLogoUrl(accountResult.data.primaryLogoUrl || '')
      setPrimaryLogoFileName(accountResult.data.primaryLogoFileName || '')
      setPrimaryLogoFile(null)
      setBrandmarkLogoId(accountResult.data.brandmarkLogoId || '')
      setBrandmarkLogoUrl(accountResult.data.brandmarkLogoUrl || '')
      setBrandmarkLogoFileName(accountResult.data.brandmarkLogoFileName || '')
      setBrandmarkLogoFile(null)
      setIsLoading(false)
    }

    void load()
  }, [editId, isEditMode])

  const bankOptions = useMemo(
    () =>
      banks.map((bank) => ({
        value: bank.id,
        label:
          bank.name && bank.shortName
            ? `${bank.name} (${bank.shortName})`
            : bank.name || bank.shortName || bank.code || bank.id,
      })),
    [banks],
  )

  const currentBalanceValue = useMemo<number | string>(() => currentBalance, [currentBalance])

  const handleLogoSelection = (selectedFile: File, kind: LogoKind) => {
    if (!selectedFile) return
    if (!LOGO_ACCEPT_TYPES.includes(selectedFile.type)) {
      setFeedback({
        type: 'error',
        message: 'Unsupported file format. Please upload PNG, JPEG, or WEBP.',
      })
      return
    }
    setCropKind(kind)
    setCropImageSrc(URL.createObjectURL(selectedFile))
    setCrop(undefined)
    setCompletedCrop(undefined)
    setCropModalOpen(true)
  }

  // react-image-crop: set completed crop
  const onCropComplete = (c: Crop, percentCrop: Crop) => {
    setCompletedCrop(c)
  }

  // react-image-crop: crop and save
  const handleCropSave = async () => {
    if (!cropImageSrc || !completedCrop || !imageRef) return
    try {
      const canvas = document.createElement('canvas')
      const scaleX = imageRef.naturalWidth / imageRef.width
      const scaleY = imageRef.naturalHeight / imageRef.height
      canvas.width = completedCrop.width || 1
      canvas.height = completedCrop.height || 1
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No canvas context')
      ctx.drawImage(
        imageRef,
        (completedCrop.x || 0) * scaleX,
        (completedCrop.y || 0) * scaleY,
        (completedCrop.width || 1) * scaleX,
        (completedCrop.height || 1) * scaleY,
        0,
        0,
        completedCrop.width || 1,
        completedCrop.height || 1,
      )
      canvas.toBlob((blob) => {
        if (!blob) {
          setFeedback({ type: 'error', message: 'Failed to crop image.' })
          return
        }
        const croppedFile = new File([blob], 'cropped-logo.png', { type: blob.type })
        const previewUrl = URL.createObjectURL(croppedFile)
        if (cropKind === 'primary') {
          if (primaryLogoUrl.startsWith('blob:')) URL.revokeObjectURL(primaryLogoUrl)
          setPrimaryLogoFile(croppedFile)
          setPrimaryLogoId('')
          setPrimaryLogoUrl(previewUrl)
          setPrimaryLogoFileName(croppedFile.name)
        } else {
          if (brandmarkLogoUrl.startsWith('blob:')) URL.revokeObjectURL(brandmarkLogoUrl)
          setBrandmarkLogoFile(croppedFile)
          setBrandmarkLogoId('')
          setBrandmarkLogoUrl(previewUrl)
          setBrandmarkLogoFileName(croppedFile.name)
        }
        setCropModalOpen(false)
        setCropImageSrc(null)
        setCompletedCrop(undefined)
        setImageRef(null)
      }, 'image/png')
    } catch (e) {
      setFeedback({ type: 'error', message: 'Failed to crop image.' })
    }
  }

  const uploadLogoFile = async (
    file: File,
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result?.success || !result?.data?.id) {
        return { success: false, error: result?.error || 'Failed to upload logo.' }
      }

      return { success: true, id: String(result.data.id) }
    } catch (error) {
      console.error('Logo upload failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload logo.',
      }
    }
  }

  const clearLogo = (kind: LogoKind) => {
    if (kind === 'primary') {
      if (primaryLogoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(primaryLogoUrl)
      }

      setPrimaryLogoId('')
      setPrimaryLogoUrl('')
      setPrimaryLogoFileName('')
      setPrimaryLogoFile(null)
      return
    }

    if (brandmarkLogoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(brandmarkLogoUrl)
    }

    setBrandmarkLogoId('')
    setBrandmarkLogoUrl('')
    setBrandmarkLogoFileName('')
    setBrandmarkLogoFile(null)
  }

  const handleSave = async () => {
    setFeedback(null)
    let hasError = false

    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Name is required')
      hasError = true
    } else {
      setNameError(null)
    }

    if (!bankId) {
      setBankError('Bank is required')
      hasError = true
    } else {
      setBankError(null)
    }

    const parsedStartingBalance =
      typeof startingBalance === 'number'
        ? startingBalance
        : Number(startingBalance.replace(/,/g, '').trim())

    if (startingBalance === '' || Number.isNaN(parsedStartingBalance)) {
      setStartingBalanceError('Starting Balance is required')
      hasError = true
    } else {
      setStartingBalanceError(null)
    }

    const parsedCurrentBalance =
      typeof currentBalance === 'number'
        ? currentBalance
        : Number(currentBalance.replace(/,/g, '').trim())

    if (hasError) return

    const validatedBankId = bankId
    if (!validatedBankId) return

    setIsSaving(true)

    let finalPrimaryLogoId = primaryLogoId || null
    let finalBrandmarkLogoId = brandmarkLogoId || null

    if (primaryLogoFile) {
      const uploadResult = await uploadLogoFile(primaryLogoFile)
      if (!uploadResult.success || !uploadResult.id) {
        setFeedback({
          type: 'error',
          message: uploadResult.error || 'Failed to upload primary logo.',
        })
        setIsSaving(false)
        return
      }

      finalPrimaryLogoId = uploadResult.id
      setPrimaryLogoId(uploadResult.id)
      setPrimaryLogoFile(null)
    }

    if (brandmarkLogoFile) {
      const uploadResult = await uploadLogoFile(brandmarkLogoFile)
      if (!uploadResult.success || !uploadResult.id) {
        setFeedback({
          type: 'error',
          message: uploadResult.error || 'Failed to upload brandmark logo.',
        })
        setIsSaving(false)
        return
      }

      finalBrandmarkLogoId = uploadResult.id
      setBrandmarkLogoId(uploadResult.id)
      setBrandmarkLogoFile(null)
    }

    if (isEditMode) {
      if (!editId) {
        setFeedback({ type: 'error', message: 'Missing financial account id.' })
        setIsSaving(false)
        return
      }

      const result = await updateFinancialAccount(editId, {
        name: trimmedName,
        bankId: validatedBankId,
        startingBalance: parsedStartingBalance,
        currentBalance: parsedCurrentBalance,
        primaryLogoId: finalPrimaryLogoId,
        brandmarkLogoId: finalBrandmarkLogoId,
      })

      if (result.success) {
        router.push(`/app/financial-accounts/${editId}`)
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to update financial account.',
        })
      }
    } else {
      const result = await createFinancialAccount({
        name: trimmedName,
        bankId: validatedBankId,
        startingBalance: parsedStartingBalance,
        currentBalance: parsedCurrentBalance,
        primaryLogoId: finalPrimaryLogoId,
        brandmarkLogoId: finalBrandmarkLogoId,
      })

      if (result.success && result.id) {
        router.push(`/app/financial-accounts/${result.id}`)
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to create financial account.',
        })
      }
    }

    setIsSaving(false)
  }

  const renderLogoDropzone = (args: {
    kind: LogoKind
    label: string
    fileName: string
    imageUrl: string
  }) => {
    const { kind, label, fileName, imageUrl } = args

    return (
      <Card withBorder radius="md" p="sm">
        <Stack gap="xs">
          <Text fw={600} size="sm">
            {label}
          </Text>
          <Dropzone
            onDrop={(files) => {
              const selected = files[0]
              if (!selected) return
              handleLogoSelection(selected, kind)
            }}
            onReject={() => {
              setFeedback({
                type: 'error',
                message: `${label}: invalid file. Use PNG, JPEG, or WEBP up to 5MB.`,
              })
            }}
            maxSize={LOGO_MAX_SIZE_BYTES}
            accept={LOGO_ACCEPT_TYPES}
            maxFiles={1}
            disabled={isSaving}
            radius="md"
          >
            <Group justify="center" py="xs" style={{ pointerEvents: 'none' }}>
              <Dropzone.Accept>
                <CheckCircle size={28} />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <Ban size={28} />
              </Dropzone.Reject>
              <Dropzone.Idle>
                {fileName ? <CheckCircle size={28} /> : <Upload size={28} />}
              </Dropzone.Idle>
            </Group>

            <Text ta="center" size="sm" fw={500}>
              <Dropzone.Accept>Drop file to upload</Dropzone.Accept>
              <Dropzone.Reject>Invalid file</Dropzone.Reject>
              <Dropzone.Idle>{fileName || `Upload ${label.toLowerCase()}`}</Dropzone.Idle>
            </Text>

            <Text ta="center" c="dimmed" size="xs" mt={4}>
              PNG, JPEG, WEBP up to 5MB. Uploads when you click Save.
            </Text>
          </Dropzone>

          {imageUrl ? <Image src={imageUrl} alt={label} h={72} fit="contain" radius="sm" /> : null}
          <Modal
            opened={cropModalOpen}
            onClose={() => setCropModalOpen(false)}
            title="Crop Logo"
            size="lg"
            centered
          >
            {cropImageSrc && (
              <>
                <Group mb="xs" justify="flex-end">
                  <Button
                    size="xs"
                    variant={cropAspect === 1 ? 'filled' : 'outline'}
                    onClick={() => setCropAspect(cropAspect === 1 ? undefined : 1)}
                  >
                    {cropAspect === 1 ? '1:1 Aspect On' : '1:1 Aspect Off'}
                  </Button>
                </Group>
                <Box
                  style={{ position: 'relative', width: '100%', height: 320, background: '#222' }}
                >
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={onCropComplete}
                    aspect={cropAspect}
                    keepSelection={false}
                    style={{ maxHeight: 320 }}
                  >
                    <img
                      src={cropImageSrc}
                      alt="Crop"
                      ref={(el) => setImageRef(el)}
                      style={{ maxHeight: 320, display: 'block', margin: '0 auto' }}
                    />
                  </ReactCrop>
                </Box>
              </>
            )}
            <Group mt="md" justify="flex-end">
              <Button variant="default" onClick={() => setCropModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCropSave}>Crop & Use</Button>
            </Group>
          </Modal>

          <Group justify="space-between">
            <Text size="xs" c="dimmed" lineClamp={1} style={{ maxWidth: '75%' }}>
              {fileName || 'No file selected'}
            </Text>
            <Button
              size="xs"
              variant="light"
              color="gray"
              disabled={isSaving || !fileName}
              onClick={() => clearLogo(kind)}
            >
              Remove
            </Button>
          </Group>
        </Stack>
      </Card>
    )
  }

  return (
    <Stack gap="md" style={{ flex: 1 }}>
      <Group justify="space-between" align="center">
        <Title order={4}>
          {isEditMode ? 'Edit Financial Account' : 'Create Financial Account'}
        </Title>
      </Group>

      {feedback && (
        <Alert withCloseButton color={feedback.type === 'success' ? 'green' : 'red'} title="Notice">
          {feedback.message}
        </Alert>
      )}

      <Box>
        {isLoading ? (
          <Text c="dimmed">Loading...</Text>
        ) : (
          <Stack gap="sm">
            <Fieldset legend="Profile" p="sm" m="0" radius="md">
              <TextInput
                label="Name"
                value={name}
                onChange={(event) => {
                  setName(event.currentTarget.value)
                  setNameError(null)
                }}
                disabled={isSaving}
                error={nameError}
                required
              />

              <Grid mt="sm">
                <Grid.Col span={6}>
                  {renderLogoDropzone({
                    kind: 'primary',
                    label: 'Primary Logo',
                    fileName: primaryLogoFileName,
                    imageUrl: primaryLogoUrl,
                  })}
                </Grid.Col>
                <Grid.Col span={6}>
                  {renderLogoDropzone({
                    kind: 'brandmark',
                    label: 'Brandmark Logo',
                    fileName: brandmarkLogoFileName,
                    imageUrl: brandmarkLogoUrl,
                  })}
                </Grid.Col>
              </Grid>
            </Fieldset>
            <Fieldset legend="Finance" p="sm" m="0" radius="md">
              <Grid>
                <Grid.Col span={6}>
                  <Select
                    label="Bank"
                    data={bankOptions}
                    value={bankId}
                    onChange={(value) => {
                      setBankId(value)
                      setBankError(null)
                    }}
                    searchable
                    disabled={isSaving || (isEditMode && Boolean(bankId))}
                    error={bankError}
                    required
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Starting Balance"
                    value={startingBalance}
                    onChange={(value) => {
                      setStartingBalance(value)
                      setStartingBalanceError(null)
                    }}
                    min={0}
                    leftSection="₱"
                    decimalScale={2}
                    fixedDecimalScale
                    thousandSeparator=","
                    hideControls
                    disabled={isSaving || (isEditMode && Boolean(startingBalance))}
                    error={startingBalanceError}
                    required
                  />
                </Grid.Col>
              </Grid>
            </Fieldset>
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => router.push('/app/financial-accounts')}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} loading={isSaving}>
                {isEditMode ? 'Save Changes' : 'Create Financial Account'}
              </Button>
            </Group>
          </Stack>
        )}
      </Box>
    </Stack>
  )
}
