"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
  showInfo?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize = 10,
  totalItems,
  showInfo = true,
}: PaginationProps) {
  // Don't render if there's only one page or no pages
  if (totalPages <= 1) return null;

  // Calculate range for "Showing X-Y of Z"
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems || currentPage * pageSize);

  // Generate page numbers to display (max 5 with ellipsis)
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav 
      className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border-t border-gray-100"
      aria-label="Paginazione"
      role="navigation"
    >
      {/* Info text */}
      {showInfo && totalItems !== undefined && (
        <p className="text-sm text-gray-600" aria-live="polite">
          Mostrando {startItem}-{endItem} di {totalItems} elementi
        </p>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-1" role="group" aria-label="Controlli paginazione">
        {/* First page button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label="Vai alla prima pagina"
        >
          <ChevronsLeft size={18} aria-hidden="true" />
        </button>

        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label="Vai alla pagina precedente"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Precedente</span>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-2">
          {pageNumbers.map((page, index) => (
            <span key={index}>
              {page === "..." ? (
                <span className="px-2 py-1 text-gray-400" aria-hidden="true">...</span>
              ) : (
                <button
                  onClick={() => onPageChange(page as number)}
                  className={`min-w-[36px] h-9 px-3 py-1 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                    currentPage === page
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  aria-label={`Pagina ${page}`}
                  aria-current={currentPage === page ? "page" : undefined}
                >
                  {page}
                </button>
              )}
            </span>
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label="Vai alla pagina successiva"
        >
          <span className="hidden sm:inline">Successivo</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>

        {/* Last page button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label="Vai all'ultima pagina"
        >
          <ChevronsRight size={18} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
