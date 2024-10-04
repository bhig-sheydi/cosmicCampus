import React, { useState, useEffect } from 'react';
import { CardCustom } from './CardCustom';
import { CardCustomSkeleton } from './CardCustomSkeleton';

const CardCustomContainer = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate a loading delay (e.g., fetching data or images)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Adjust the delay as needed

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {isLoading ? <CardCustomSkeleton /> : <CardCustom />}
    </>
  );
}

export default CardCustomContainer;
