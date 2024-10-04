import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function CardCustomSkeleton() {
  return (
    <div className="p-5 mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
      {Array(6).fill("").map((_, index) => (
        <div
          key={index}
          className="w-full h-[500px] shadow-lg dark:shadow-pink-500 transition-transform duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl hover:shadow-purple-400"
        >
          <div className="flex flex-col aspect-[20/16] items-center justify-center p-8 text-center">
            {/* Skeleton for Image */}
            <Skeleton className="w-40 h-40 rounded-md mb-4 bg-gray-300" />

            {/* Skeleton for Service Name */}
            <Skeleton className="w-[60%] h-6 mb-2 rounded-md bg-gray-300" />

            {/* Skeleton for Service Description */}
            <Skeleton className="w-full h-[100px] rounded-md bg-gray-300" />

            {/* Skeleton for Button */}
            <Skeleton className="mt-4 w-40 h-10 rounded-full bg-gray-300" />
          </div>
        </div>
      ))}
    </div>
  );
}
