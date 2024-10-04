import React from 'react';
import { Skeleton } from '@/components/ui/skeleton'; // Adjust the import path as needed

const RolesCardCustomSkeleton = () => {
  return (
    <div className="pt-11">
      <div className="text-center mb-6">
        <Skeleton className="w-3/4 h-12 mx-auto rounded-md bg-gray-300 dark:bg-gray-700" />
      </div>
      <div className="p-5 mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="w-full h-auto bg-gradient-to-r from-purple-100 via-white to-purple-100 dark:from-purple-900 dark:via-gray-800 dark:to-purple-900 rounded-lg shadow-lg"
          >
            <div className="p-6 text-center">
              {/* Role Name */}
              <Skeleton className="w-3/4 h-6 mx-auto mb-4 rounded-md bg-gray-300 dark:bg-gray-700" />
              {/* Role Description */}
              <Skeleton className="w-5/6 h-4 mx-auto mb-6 rounded-md bg-gray-300 dark:bg-gray-700" />
              {/* Subroles List */}
              <div className="mb-4">
                {Array.from({ length: 3 }).map((_, subIndex) => (
                  <Skeleton
                    key={subIndex}
                    className="w-5/6 h-4 mb-2 rounded-md bg-gray-300 dark:bg-gray-700"
                  />
                ))}
              </div>
              {/* Hover Card */}
              <Skeleton className="w-40 h-10 mx-auto rounded-md bg-gray-300 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RolesCardCustomSkeleton;
