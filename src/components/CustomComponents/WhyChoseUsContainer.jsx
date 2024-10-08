import React, { useState, useEffect } from 'react';
import WhyChooseUs from '../CustomComponents/WhyChoseUs';
import WhyChooseUsSkeleton from './WhyChooseUsSkeleton';

const WhyChooseUsContainer = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Simulate loading delay

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {isLoading ? <WhyChooseUsSkeleton /> : <WhyChooseUs />}
    </>
  );
};

export default WhyChooseUsContainer;
