import React from 'react';
import { Users } from 'lucide-react';

const EmptyState = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
    <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
      <Users className="w-12 h-12 text-gray-300 dark:text-gray-600" />
      <p className="text-lg font-medium">No students found</p>
      <p className="text-sm">Try adjusting your search or filters</p>
    </div>
  </div>
);

export default EmptyState;