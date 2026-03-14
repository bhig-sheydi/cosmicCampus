import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => (
  <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
    <div className="text-sm text-gray-600 dark:text-gray-400">
      Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
      <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span>{' '}
      of <span className="font-medium">{totalItems}</span>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={() => onPageChange(p => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="text-sm font-medium text-gray-900 dark:text-white px-3">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
        disabled={currentPage >= totalPages}
        className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  </div>
);

export default Pagination;