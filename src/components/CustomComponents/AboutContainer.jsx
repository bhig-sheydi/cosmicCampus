import React, { useState, useEffect } from 'react';
import About from './About';
import AboutSkeleton from './AboutSkeleton';

const AboutContainer = () => {
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
      {isLoading ? <AboutSkeleton /> : <About />}
    </>
  );
}

export default AboutContainer;
