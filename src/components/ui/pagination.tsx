"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

export interface PaginationInfo {
  count: number
  currentPage: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface PaginationProps {
  paginationInfo: PaginationInfo
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  disabled?: boolean
  className?: string
}

export function Pagination({
  paginationInfo,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  className = ""
}: PaginationProps) {
  const { count, currentPage, pageSize, hasNext, hasPrevious } = paginationInfo
  
  const totalPages = Math.ceil(count / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, count)

  const handleFirstPage = () => onPageChange(1)
  const handlePreviousPage = () => onPageChange(currentPage - 1)
  const handleNextPage = () => onPageChange(currentPage + 1)
  const handleLastPage = () => onPageChange(totalPages)

  const getVisiblePages = () => {
    const pages: number[] = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      // Show all pages if total pages is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show pages around current page
      const start = Math.max(1, currentPage - 2)
      const end = Math.min(totalPages, currentPage + 2)
      
      // Always show first page
      if (start > 1) {
        pages.push(1)
        if (start > 2) {
          pages.push(-1) // Ellipsis marker
        }
      }
      
      // Show pages around current
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      // Always show last page
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push(-1) // Ellipsis marker
        }
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  const visiblePages = getVisiblePages()

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Page size selector */}
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>
          Showing {startItem}-{endItem} of {count} tests
        </span>
        <div className="flex items-center gap-2">
          <span>Tests per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className="bg-zinc-800 border border-zinc-600/50 rounded px-2 py-1 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          {/* First page */}
          <Button
            onClick={handleFirstPage}
            disabled={!hasPrevious || disabled}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 disabled:opacity-50 disabled:hover:bg-transparent"
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>

          {/* Previous page */}
          <Button
            onClick={handlePreviousPage}
            disabled={!hasPrevious || disabled}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 disabled:opacity-50 disabled:hover:bg-transparent"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Page numbers */}
          {visiblePages.map((page, index) => {
            if (page === -1) {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="h-8 w-8 flex items-center justify-center text-zinc-500"
                >
                  ...
                </span>
              )
            }

            return (
              <Button
                key={page}
                onClick={() => onPageChange(page)}
                disabled={disabled}
                size="sm"
                variant={page === currentPage ? "default" : "ghost"}
                className={`h-8 w-8 p-0 ${
                  page === currentPage
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
                } disabled:opacity-50`}
              >
                {page}
              </Button>
            )
          })}

          {/* Next page */}
          <Button
            onClick={handleNextPage}
            disabled={!hasNext || disabled}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 disabled:opacity-50 disabled:hover:bg-transparent"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Last page */}
          <Button
            onClick={handleLastPage}
            disabled={!hasNext || disabled}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 disabled:opacity-50 disabled:hover:bg-transparent"
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
