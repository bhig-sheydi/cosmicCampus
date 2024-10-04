import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const FooterSkeleton = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 p-8">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Skeleton for Brand Section */}
        <div>
          {/* Skeleton for Brand Name */}
          <Skeleton className="h-8 w-64 rounded-md bg-gray-700" />
          {/* Skeleton for Description */}
          <Skeleton className="mt-4 h-6 w-full rounded-md bg-gray-700" />
          <Skeleton className="mt-2 h-6 w-5/6 rounded-md bg-gray-700" />
          <Skeleton className="mt-2 h-6 w-4/6 rounded-md bg-gray-700" />
        </div>

        {/* Skeleton for Navigation Links */}
        <div>
          {/* Skeleton for Section Title */}
          <Skeleton className="h-8 w-48 rounded-md bg-gray-700 mb-4" />
          {/* Skeleton for Links */}
          <Skeleton className="h-6 w-32 mb-2 rounded-md bg-gray-700" />
          <Skeleton className="h-6 w-32 mb-2 rounded-md bg-gray-700" />
          <Skeleton className="h-6 w-32 mb-2 rounded-md bg-gray-700" />
          <Skeleton className="h-6 w-32 mb-2 rounded-md bg-gray-700" />
        </div>

        {/* Skeleton for Social Media Icons */}
        <div>
          {/* Skeleton for Section Title */}
          <Skeleton className="h-8 w-48 rounded-md bg-gray-700 mb-4" />
          {/* Skeleton for Icons */}
          <div className="flex space-x-4">
            <Skeleton className="h-8 w-8 rounded-full bg-gray-700" />
            <Skeleton className="h-8 w-8 rounded-full bg-gray-700" />
            <Skeleton className="h-8 w-8 rounded-full bg-gray-700" />
            <Skeleton className="h-8 w-8 rounded-full bg-gray-700" />
          </div>
        </div>

      </div>

      {/* Skeleton for Bottom Section */}
      <div className="mt-8 border-t border-gray-700 pt-4 text-center">
        <Skeleton className="h-6 w-64 mx-auto rounded-md bg-gray-700" />
      </div>
    </footer>
  );
};

export default FooterSkeleton;
