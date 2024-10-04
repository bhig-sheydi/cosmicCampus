import React, { useState, useEffect } from 'react';
import InfoCardSkeleton from './InfoCardSkeleton';
import InfoCard from './InfoCard';


const InfoCardContainer = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Simulate loading delay

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {isLoading ? <InfoCardSkeleton /> : <InfoCard />}
    </>
  );
};

export default InfoCardContainer;
