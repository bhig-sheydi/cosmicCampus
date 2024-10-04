import React, { useState, useEffect } from 'react';

import RolesCardCustomSkeleton from './RolesCardCustomSkeleton';
import { RolesCardCustom } from './RolesCardCustom';


const RolesCardCustomContainer = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Simulate loading delay

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {isLoading ? <RolesCardCustomSkeleton /> : <RolesCardCustom />}
    </>
  );
};

export default RolesCardCustomContainer;
