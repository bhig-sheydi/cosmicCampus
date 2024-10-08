import { DiscountComponent } from '@/components/customComponents/DiscountCompnent';
import InfoCard from '@/components/customComponents/InfoCard';
import InfoCardContainer from '@/components/customComponents/InfoCardContainer';
import RolesCardCustomContainer from '@/components/customComponents/RoleCardCustomContainer';
import { RolesCardCustom } from '@/components/customComponents/RolesCardCustom';
import React from 'react';

const Branding = () => {
  return (
    <div className='pt-40'>
       <InfoCardContainer/>
       <RolesCardCustomContainer/>
       <DiscountComponent/>
    </div>
  );
};

export default Branding;
