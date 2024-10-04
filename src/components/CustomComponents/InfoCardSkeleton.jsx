import React from 'react';
import { Skeleton } from '@/components/ui/skeleton'; // Adjust the import path as needed
import { Star, Info, Quote as QuoteIcon } from 'lucide-react'; // Importing icons from lucide-react

const InfoCardSkeleton = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto bg-gradient-to-r from-purple-100 via-white to-purple-100 dark:from-purple-900 dark:via-gray-800 dark:to-purple-900 rounded-lg shadow-lg">
      {/* Skeleton for Heading */}
      <div className="mb-6 text-center">
        <Skeleton className="h-8 w-80 mx-auto rounded-md bg-gray-300 dark:bg-gray-700" />
      </div>

      {/* Skeleton for Description */}
      <div className="text-center mb-8">
        <Skeleton className="h-6 w-4/5 mx-auto rounded-md bg-gray-300 dark:bg-gray-700" />
      </div>

      {/* Skeleton for Quote */}
      <div className="mb-8">
        <Skeleton className="h-24 w-full rounded-md bg-gray-300 dark:bg-gray-700" />
        <div className="text-center mt-4">
          <Skeleton className="h-6 w-1/4 mx-auto rounded-md bg-gray-300 dark:bg-gray-700" />
        </div>
      </div>

      {/* Skeleton for Subheading */}
      <div className="mt-12">
        <div className="mb-6 text-center">
          <Skeleton className="h-8 w-80 mx-auto rounded-md bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Skeleton for Additional Content */}
        <Skeleton className="h-24 w-full rounded-md bg-gray-300 dark:bg-gray-700" />
      </div>
    </div>
  );
};

export default InfoCardSkeleton;
