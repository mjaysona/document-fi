'use client'

import { Button, Group } from '@mantine/core'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import classes from '../page.module.scss'

type UploadStatus = 'unsaved' | 'saved' | 'verified' | undefined

interface Upload {
  savedStatus?: UploadStatus
  [key: string]: any
}

interface UploadPaginationProps {
  uploads: Upload[]
  activeIndex: number
  onPageChange: (index: number) => void
  disabled?: boolean
  itemsPerPage?: number
}

/**
 * UploadPagination Component
 * Renders a pagination UI with status-aware styling and ellipsis boundaries.
 * Shows up to itemsPerPage items, with ellipsis (...) for ranges beyond visible window.
 *
 * Examples:
 * - 3 items: [1, 2, 3]
 * - 8 items: [1, 2, 3, 4, 5, ..., 8]
 * - 15 items, active=8: [1, ..., 5, 6, 7, 8, 9, 10, ..., 15]
 */
export default function UploadPagination({
  uploads,
  activeIndex,
  onPageChange,
  disabled = false,
  itemsPerPage = 5,
}: UploadPaginationProps) {
  if (uploads.length <= 1) return null

  const totalPages = uploads.length

  // Calculate visible page range with ellipsis support
  const getVisiblePages = (): (number | string)[] => {
    if (totalPages <= itemsPerPage) {
      return Array.from({ length: totalPages }, (_, i) => i)
    }

    const pages: (number | string)[] = []
    const halfWindow = Math.floor(itemsPerPage / 2)

    let start = Math.max(0, activeIndex - halfWindow)
    let end = Math.min(totalPages - 1, activeIndex + halfWindow)

    // Adjust window if near edges
    if (start === 0) {
      end = Math.min(totalPages - 1, itemsPerPage - 1)
    } else if (end === totalPages - 1) {
      start = Math.max(0, totalPages - itemsPerPage)
    }

    // Add first page if not visible
    if (start > 0) {
      pages.push(0)
      if (start > 1) {
        pages.push('...')
      }
    }

    // Add middle pages
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    // Add last page if not visible
    if (end < totalPages - 1) {
      if (end < totalPages - 2) {
        pages.push('...')
      }
      pages.push(totalPages - 1)
    }

    return pages
  }

  const visiblePages = getVisiblePages()

  const handlePrevious = () => {
    if (activeIndex > 0 && !disabled) {
      onPageChange(activeIndex - 1)
    }
  }

  const handleNext = () => {
    if (activeIndex < totalPages - 1 && !disabled) {
      onPageChange(activeIndex + 1)
    }
  }

  const handlePageClick = (pageIndex: number) => {
    if (!disabled && pageIndex !== activeIndex) {
      onPageChange(pageIndex)
    }
  }

  return (
    <Group gap="xs" wrap="wrap">
      <Button
        size="compact-sm"
        variant="outline"
        onClick={handlePrevious}
        disabled={activeIndex === 0 || disabled}
        p={4}
      >
        <ChevronLeft size={16} />
      </Button>

      {visiblePages.map((page, idx) => {
        if (page === '...') {
          return (
            <div
              key={`ellipsis-${idx}`}
              style={{ padding: '0 4px', display: 'flex', alignItems: 'center' }}
            >
              ...
            </div>
          )
        }

        const pageIndex = page as number
        const upload = uploads[pageIndex]
        const savedStatus = upload?.savedStatus as UploadStatus
        const isActive = pageIndex === activeIndex
        const isSaved = savedStatus === 'saved'
        const isVerified = savedStatus === 'verified'

        return (
          <Button
            key={`page-${pageIndex}`}
            size="compact-sm"
            variant={isActive ? 'filled' : 'outline'}
            color={isSaved || isVerified ? 'green' : 'gray'}
            onClick={() => handlePageClick(pageIndex)}
            disabled={disabled}
            px={10}
          >
            {isVerified ? <Check size={14} /> : pageIndex + 1}
          </Button>
        )
      })}

      <Button
        size="compact-sm"
        variant="outline"
        onClick={handleNext}
        disabled={activeIndex === totalPages - 1 || disabled}
        p={4}
      >
        <ChevronRight size={16} />
      </Button>
    </Group>
  )
}
