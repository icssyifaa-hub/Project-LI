'use client'

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

type SortDirection = 'asc' | 'desc'

type SortableHeaderProps<T extends string> = {
  label: string
  field: T
  sortField: T
  sortDirection: SortDirection
  onSort: (field: T) => void
  className: string
}

export function SortableHeader<T extends string>({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  className,
}: SortableHeaderProps<T>) {
  const isActive = sortField === field
  const Icon = isActive ? (sortDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <th className={`${className} cursor-pointer select-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-800`}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left uppercase"
        onClick={() => onSort(field)}
        aria-label={`Sort by ${label}`}
      >
        <span>{label}</span>
        <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
      </button>
    </th>
  )
}

export const compareSortValues = (
  aValue: unknown,
  bValue: unknown,
  direction: SortDirection
) => {
  const normalize = (value: unknown) => {
    if (value === null || value === undefined || value === '') return ''
    if (typeof value === 'boolean') return value ? '1' : '0'
    if (typeof value === 'number') return value

    const date = typeof value === 'string' ? Date.parse(value) : Number.NaN
    if (typeof value === 'string' && !Number.isNaN(date) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return date
    }

    return String(value).replace(/\s+/g, ' ').trim()
  }

  const a = normalize(aValue)
  const b = normalize(bValue)

  if (typeof a === 'number' && typeof b === 'number') {
    return direction === 'asc' ? a - b : b - a
  }

  const result = String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  })

  return direction === 'asc' ? result : -result
}

export type { SortDirection }
