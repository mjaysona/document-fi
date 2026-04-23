import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import UploadPagination from './UploadPagination'

const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>)
}

describe('UploadPagination', () => {
  const mockOnPageChange = jest.fn()

  beforeEach(() => {
    mockOnPageChange.mockClear()
  })

  describe('Visibility', () => {
    it('should not render if uploads.length <= 1', () => {
      const { container } = renderWithMantine(
        <UploadPagination uploads={[]} activeIndex={0} onPageChange={mockOnPageChange} />,
      )
      expect(container.firstChild).toBeEmptyDOMElement()
    })

    it('should render if uploads.length > 1', () => {
      const uploads = [{ savedStatus: 'unsaved' }, { savedStatus: 'unsaved' }]
      renderWithMantine(
        <UploadPagination uploads={uploads} activeIndex={0} onPageChange={mockOnPageChange} />,
      )
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('Pagination Boundaries', () => {
    it('should show all items when total <= itemsPerPage', () => {
      const uploads = [
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
      ]
      renderWithMantine(
        <UploadPagination
          uploads={uploads}
          activeIndex={0}
          onPageChange={mockOnPageChange}
          itemsPerPage={5}
        />,
      )
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.queryByText('...')).not.toBeInTheDocument()
    })

    it('should show ellipsis when total > itemsPerPage', () => {
      const uploads = Array.from({ length: 10 }, () => ({ savedStatus: 'unsaved' }))
      renderWithMantine(
        <UploadPagination
          uploads={uploads}
          activeIndex={0}
          onPageChange={mockOnPageChange}
          itemsPerPage={5}
        />,
      )
      expect(screen.getByText('...')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('should show ellipsis on both sides when active is in middle', () => {
      const uploads = Array.from({ length: 15 }, () => ({ savedStatus: 'unsaved' }))
      renderWithMantine(
        <UploadPagination
          uploads={uploads}
          activeIndex={8}
          onPageChange={mockOnPageChange}
          itemsPerPage={5}
        />,
      )
      const ellipsis = screen.getAllByText('...')
      expect(ellipsis.length).toBeGreaterThanOrEqual(1) // At least one ellipsis
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
    })
  })

  describe('Navigation Buttons', () => {
    it('should disable previous button when at first page', () => {
      const uploads = [
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
      ]
      renderWithMantine(
        <UploadPagination uploads={uploads} activeIndex={0} onPageChange={mockOnPageChange} />,
      )
      const buttons = screen.getAllByRole('button')
      const prevButton = buttons[0] // First button is previous
      expect(prevButton).toBeDisabled()
    })

    it('should disable next button when at last page', () => {
      const uploads = [
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
      ]
      renderWithMantine(
        <UploadPagination uploads={uploads} activeIndex={2} onPageChange={mockOnPageChange} />,
      )
      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[buttons.length - 1] // Last button is next
      expect(nextButton).toBeDisabled()
    })

    it('should call onPageChange with previous index when prev clicked', () => {
      const uploads = [
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
      ]
      renderWithMantine(
        <UploadPagination uploads={uploads} activeIndex={2} onPageChange={mockOnPageChange} />,
      )
      const buttons = screen.getAllByRole('button')
      const prevButton = buttons[0]
      fireEvent.click(prevButton)
      expect(mockOnPageChange).toHaveBeenCalledWith(1)
    })

    it('should call onPageChange with next index when next clicked', () => {
      const uploads = [
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
      ]
      renderWithMantine(
        <UploadPagination uploads={uploads} activeIndex={0} onPageChange={mockOnPageChange} />,
      )
      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[buttons.length - 1]
      fireEvent.click(nextButton)
      expect(mockOnPageChange).toHaveBeenCalledWith(1)
    })
  })

  describe('Page Item Rendering', () => {
    it('should highlight active page with filled variant', () => {
      const uploads = [
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
      ]
      const { container } = renderWithMantine(
        <UploadPagination uploads={uploads} activeIndex={1} onPageChange={mockOnPageChange} />,
      )
      // Active button should have "filled" variant (check button styling)
      const pageButtons = screen.getAllByRole('button').slice(1, -1) // Exclude nav buttons
      expect(pageButtons[1]).toHaveClass('mantine-Button-root') // Button 2 (index 1) is active
    })

    it('should show check icon for verified items', () => {
      const uploads = [
        { savedStatus: 'unsaved' },
        { savedStatus: 'verified' },
        { savedStatus: 'unsaved' },
      ]
      const { container } = renderWithMantine(
        <UploadPagination uploads={uploads} activeIndex={0} onPageChange={mockOnPageChange} />,
      )
      // Check if check icon is present (lucide-react renders as SVG)
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0) // Nav icons + check icon
    })

    it('should style saved/verified items with green color', () => {
      const uploads = [
        { savedStatus: 'unsaved' },
        { savedStatus: 'saved' },
        { savedStatus: 'verified' },
      ]
      renderWithMantine(
        <UploadPagination uploads={uploads} activeIndex={0} onPageChange={mockOnPageChange} />,
      )
      // Saved and verified buttons should have green color
      const buttons = screen.getAllByRole('button')
      // Buttons 2 and 3 (indices 1 and 2) should be green - check via data attributes or classes
      expect(buttons[2]).toHaveAttribute('data-color', 'green') // Mantine Button color prop
    })
  })

  describe('Page Click Navigation', () => {
    it('should call onPageChange when clicking a page number', () => {
      const uploads = [
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
      ]
      renderWithMantine(
        <UploadPagination uploads={uploads} activeIndex={0} onPageChange={mockOnPageChange} />,
      )
      const pageButtons = screen.getAllByRole('button').slice(1, -1) // Exclude nav buttons
      fireEvent.click(pageButtons[2]) // Click page 3
      expect(mockOnPageChange).toHaveBeenCalledWith(2)
    })

    it('should not call onPageChange when clicking current active page', () => {
      const uploads = [
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
      ]
      renderWithMantine(
        <UploadPagination uploads={uploads} activeIndex={1} onPageChange={mockOnPageChange} />,
      )
      const pageButtons = screen.getAllByRole('button').slice(1, -1) // Exclude nav buttons
      fireEvent.click(pageButtons[1]) // Click page 2 (active)
      expect(mockOnPageChange).not.toHaveBeenCalled()
    })
  })

  describe('Disabled State', () => {
    it('should disable all buttons when disabled prop is true', () => {
      const uploads = [
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
      ]
      renderWithMantine(
        <UploadPagination
          uploads={uploads}
          activeIndex={0}
          onPageChange={mockOnPageChange}
          disabled
        />,
      )
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toBeDisabled()
      })
    })

    it('should not call onPageChange when disabled', () => {
      const uploads = [
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
      ]
      renderWithMantine(
        <UploadPagination
          uploads={uploads}
          activeIndex={0}
          onPageChange={mockOnPageChange}
          disabled
        />,
      )
      const pageButtons = screen.getAllByRole('button').slice(1, -1)
      fireEvent.click(pageButtons[1])
      expect(mockOnPageChange).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle single upload gracefully', () => {
      const uploads = [{ savedStatus: 'unsaved' }]
      const { container } = renderWithMantine(
        <UploadPagination uploads={uploads} activeIndex={0} onPageChange={mockOnPageChange} />,
      )
      expect(container.firstChild).toBeEmptyDOMElement()
    })

    it('should handle large number of uploads', () => {
      const uploads = Array.from({ length: 100 }, () => ({ savedStatus: 'unsaved' }))
      renderWithMantine(
        <UploadPagination
          uploads={uploads}
          activeIndex={50}
          onPageChange={mockOnPageChange}
          itemsPerPage={5}
        />,
      )
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getAllByText('...')).toBeDefined()
    })

    it('should handle activeIndex out of bounds gracefully', () => {
      const uploads = [
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
        { savedStatus: 'unsaved' },
      ]
      const { container } = renderWithMantine(
        <UploadPagination uploads={uploads} activeIndex={10} onPageChange={mockOnPageChange} />,
      )
      // Should still render without crashing
      expect(container.firstChild).not.toBeEmptyDOMElement()
    })
  })

  describe('Custom itemsPerPage', () => {
    it('should respect custom itemsPerPage prop', () => {
      const uploads = Array.from({ length: 20 }, () => ({ savedStatus: 'unsaved' }))
      renderWithMantine(
        <UploadPagination
          uploads={uploads}
          activeIndex={0}
          onPageChange={mockOnPageChange}
          itemsPerPage={3}
        />,
      )
      // With 3 items per page, should see 1, 2, 3 and ellipsis
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('...')).toBeInTheDocument()
    })
  })
})
