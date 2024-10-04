import React from 'react';
import { Button } from '@/components/ui/button'; // Adjust the import path as needed

const DiscountButton = ({ imageSrc }) => {
  return (
    <div className="flex justify-center items-center w-full">
      <Button
        variant="outline"
        className=" h-24 text-lg rounded-full shadow-md shadow-purple-500 bg-gradient-to-r p-7 w-[100%] from-blue-500 via-purple-500 to-pink-500 animate-gradient-move  flex items-center justify-center"
      >
        <h1 className="text-white">See Big Discounts</h1>
        <img src={imageSrc} alt="Discount" className="mix-blend-darken w-16 ml-2" />
      </Button>
    </div>
  );
};

export default DiscountButton;
