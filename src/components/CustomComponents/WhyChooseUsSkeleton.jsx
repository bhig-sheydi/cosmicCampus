import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const WhyChooseUsSkeleton = () => {
  return (
    <div className="w-full p-8 bg-gradient-to-b from-white via-blue-50 to-pink-100 dark:from-gray-800 dark:via-purple-800 dark:to-pink-900">
      <div className="mt-16 text-center">
        {/* Skeleton for main title */}
        <Skeleton className="h-10 w-72 mx-auto rounded-md bg-gray-300 dark:bg-gray-700" />
        {/* Skeleton for subtitle */}
        <Skeleton className="h-8 w-64 mx-auto mt-4 rounded-md bg-gray-300 dark:bg-gray-700" />
      </div>

      <div className="mt-8 space-y-8">
        {/* Skeleton for each section */}
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col items-center text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg transform transition-transform duration-300"
          >
            {/* Skeleton for icon */}
            <Skeleton className="h-14 w-14 mb-4 rounded-full bg-gray-300 dark:bg-gray-700" />
            {/* Skeleton for section title */}
            <Skeleton className="h-6 w-40 rounded-md bg-gray-300 dark:bg-gray-700" />
            {/* Skeleton for section content */}
            <Skeleton className="h-4 w-64 mt-4 rounded-md bg-gray-300 dark:bg-gray-700" />
            <Skeleton className="h-4 w-56 mt-2 rounded-md bg-gray-300 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default WhyChooseUsSkeleton;
