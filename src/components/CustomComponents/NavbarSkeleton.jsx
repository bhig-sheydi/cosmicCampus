import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export function NavbarSkeleton() {
  return (
    <nav className="fixed top-0 left-0 z-50 flex justify-between items-center bg-gradient-to-r p-7 w-full 
     from-blue-500 via-purple-500 to-pink-500 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 shadow-md 
     animate-gradient-move">
      <div className="flex items-center gap-2">
        {/* Logo Skeleton */}
        <Skeleton className="w-11 h-11 rounded-full bg-gray-300 dark:bg-gray-700" />
        
        {/* Brand Name Skeleton */}
        <Skeleton className="w-20 h-[28px] rounded-md bg-gray-300 dark:bg-gray-700" />
      </div>
      <div className="flex items-center gap-8 pr-7">
        {/* Navigation Links Skeleton */}
        <Skeleton className="w-16 h-[30px] rounded-md bg-gray-300 dark:bg-gray-700" />
        <Skeleton className="w-16 h-[30px] rounded-md bg-gray-300 dark:bg-gray-700" />
        
      </div>
    </nav>
  );
}
