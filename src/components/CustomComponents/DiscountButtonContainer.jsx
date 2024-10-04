import React, { useState, useEffect } from 'react';
import DiscountButton from './DiscountButton';
import DiscountButtonSkeleton from './DiscountButtonSkeleton';
import dance from "../../assets/discount dance.gif"

const DiscountButtonContainer = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Simulate loading delay

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {isLoading ? <DiscountButtonSkeleton /> : <DiscountButton imageSrc={dance} />}
    </>
  );
};

export default DiscountButtonContainer;
