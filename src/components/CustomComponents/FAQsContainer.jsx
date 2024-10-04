import React, { useState, useEffect } from 'react';
import FAQs from './FAQs';
import FAQsSkeleton from './FAQsSkeleton';

const FAQsContainer = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Simulate loading delay

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {isLoading ? <FAQsSkeleton /> : <FAQs />}
    </>
  );
};

export default FAQsContainer;
