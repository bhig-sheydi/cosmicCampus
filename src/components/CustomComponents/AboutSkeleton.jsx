import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CardCustomSkeleton } from './CardCustomSkeleton';

const AboutSkeleton = () => {
  return (
    <div className='w-full h-auto flex flex-col items-center mt-10 overflow-x-hidden bg-gradient-to-b from-white 
     to-purple-100 dark:bg-[linear-gradient(to_bottom,_black,_#2c132e)] animate-gradient-move'>
      
      {/* Skeleton for H1 (About Us Title) */}
      <Skeleton className='w-[300px] h-[40px] rounded-md bg-gray-300 dark:bg-gray-700 mb-6' />
      
      {/* Skeleton for Carousel */}
      <div className='w-full max-w-screen-xl overflow-x-hidden p-4'>
        <Skeleton className='w-full h-[500px] rounded-md bg-gray-300 dark:bg-gray-700' />

      </div>

      {/* Skeleton for Custom Card */}
      <div className='w-full max-w-screen-xl mt-8'>
        <CardCustomSkeleton/>
      </div>
    </div>
  );
}

export default AboutSkeleton;
