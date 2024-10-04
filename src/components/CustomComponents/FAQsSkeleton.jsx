import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const FAQsSkeleton = () => {
  return (
    <div className="w-full p-8 bg-gradient-to-b from-white via-blue-50 to-pink-100 dark:from-gray-800 dark:via-purple-800 dark:to-pink-900">
      <div className="text-center mt-16">
        {/* Skeleton for main title */}
        <Skeleton className="h-10 w-72 mx-auto rounded-md bg-gray-300 dark:bg-gray-700" />
        {/* Skeleton for subtitle */}
        <Skeleton className="h-8 w-64 mx-auto mt-4 rounded-md bg-gray-300 dark:bg-gray-700" />
      </div>

      <div className="mt-8 space-y-4">
        {/* Skeleton for each FAQ */}
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {/* Skeleton for icon */}
                <Skeleton className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-700" />
                {/* Skeleton for question */}
                <Skeleton className="h-6 w-48 rounded-md bg-gray-300 dark:bg-gray-700" />
              </div>
              {/* Skeleton for Chevron */}
              <Skeleton className="h-6 w-6 rounded-md bg-gray-300 dark:bg-gray-700" />
            </div>
            {/* Skeleton for answer */}
            <Skeleton className="mt-4 h-4 w-full rounded-md bg-gray-300 dark:bg-gray-700" />
            <Skeleton className="mt-2 h-4 w-5/6 rounded-md bg-gray-300 dark:bg-gray-700" />
            <Skeleton className="mt-2 h-4 w-4/6 rounded-md bg-gray-300 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQsSkeleton;
