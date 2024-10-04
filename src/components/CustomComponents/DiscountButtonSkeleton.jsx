import React from 'react';
import { Skeleton } from '@/components/ui/skeleton'; // Adjust the import path as needed

const DiscountButtonSkeleton = () => {
  return (
    <div className="flex justify-center items-center w-full">
      <div className="w-44 h-24 flex items-center justify-center w-full">
        <Skeleton className="w-full h-full rounded-full bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 animate-pulse" />
      </div>
    </div>
  );
};

export default DiscountButtonSkeleton;
