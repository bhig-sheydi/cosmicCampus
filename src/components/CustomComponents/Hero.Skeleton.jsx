import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const HeroSkeleton = () => {
  return (
    <div className='w-full flex items-center justify-center shadow-md h-[87vh] relative mt-24 bg-white dark:bg-black'>
      <div className='flex flex-col items-center justify-center gap-7'>
        <div className="relative">
          {/* Rotating Skeleton for Logo */}
          <Skeleton className='w-32 h-32 rounded-full animate-rotate-3d relative z-10 bg-gray-300 dark:bg-gray-700' />

          {/* Moving Shadow Skeleton */}
          <Skeleton className="w-32 h-8 absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-2 rounded-full bg-gray-200 dark:bg-gray-800 blur-md opacity-75 animate-shadow-rotate" />
        </div>
        {/* Increased width for the first text skeleton */}
        <Skeleton className="w-[350px] h-[40px] rounded-md animate-pulse bg-gray-300 dark:bg-gray-700" />
        <div className='w-full flex flex-col justify-center items-center gap-7'>
          <Skeleton className="w-[250px] h-[30px] rounded-md animate-pulse bg-gray-300 dark:bg-gray-700" />
          <Skeleton className="w-[150px] h-[40px] rounded-md animate-pulse bg-gray-300 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  )
}

export default HeroSkeleton
