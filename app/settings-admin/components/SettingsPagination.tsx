'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { settingsSelectContentClass } from './settings-styles'

const rowsPerPageOptions = [10, 25, 50, 100] as const
type RowsPerPageValue = number | 'all'

type SettingsPaginationProps = {
  currentPage: number
  rowsPerPage: RowsPerPageValue
  totalItems: number
  totalPages: number
  showingStart: number
  showingEnd: number
  onPageChange: (page: number) => void
  onRowsPerPageChange: (rowsPerPage: RowsPerPageValue) => void
}

export function useSettingsPagination<T>(items: T[], initialRowsPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPageValue] = useState<RowsPerPageValue>(initialRowsPerPage)
  const effectiveRowsPerPage = rowsPerPage === 'all' ? Math.max(1, items.length) : rowsPerPage
  const totalPages = rowsPerPage === 'all' ? 1 : Math.max(1, Math.ceil(items.length / effectiveRowsPerPage))
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
  const pageStart = rowsPerPage === 'all' ? 0 : (safeCurrentPage - 1) * effectiveRowsPerPage
  const paginatedRows = useMemo(
    () => rowsPerPage === 'all' ? items : items.slice(pageStart, pageStart + effectiveRowsPerPage),
    [items, pageStart, rowsPerPage, effectiveRowsPerPage]
  )

  const setRowsPerPage = (value: RowsPerPageValue) => {
    setRowsPerPageValue(value)
    setCurrentPage(1)
  }

  return {
    currentPage: safeCurrentPage,
    rowsPerPage,
    totalPages,
    pageStart,
    paginatedRows,
    showingStart: items.length === 0 ? 0 : pageStart + 1,
    showingEnd: rowsPerPage === 'all' ? items.length : Math.min(pageStart + effectiveRowsPerPage, items.length),
    setCurrentPage: (page: number) => setCurrentPage(Math.min(Math.max(1, page), totalPages)),
    setRowsPerPage,
  }
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 3) return [1, 2, 3, 4, 5]
  if (currentPage >= totalPages - 2) {
    return Array.from({ length: 5 }, (_, index) => totalPages - 4 + index)
  }

  return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
}

export function SettingsPagination({
  currentPage,
  rowsPerPage,
  totalItems,
  totalPages,
  showingStart,
  showingEnd,
  onPageChange,
  onRowsPerPageChange,
}: SettingsPaginationProps) {
  const visiblePages = getVisiblePages(currentPage, totalPages)

  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span>
          Showing {showingStart} to {showingEnd} of {totalItems} entries
        </span>
        <div className="flex items-center gap-2">
          <Select
            value={String(rowsPerPage)}
            onValueChange={(value) => onRowsPerPageChange(value === 'all' ? 'all' : Number(value))}
          >
            <SelectTrigger className="h-9 w-20 border-gray-300 bg-white text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={settingsSelectContentClass}>
              {rowsPerPageOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <span>rows per page</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || totalItems === 0}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {visiblePages.map((page) => (
          <Button
            key={page}
            type="button"
            variant={page === currentPage ? 'default' : 'outline'}
            size="icon"
            className={`h-8 w-8 text-xs ${
              page === currentPage
                ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400'
                : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </Button>
        ))}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalItems === 0}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
