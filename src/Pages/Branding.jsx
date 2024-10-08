import { DiscountComponent } from '@/components/CustomComponents/DiscountCompnent';
import InfoCard from '@/components/CustomComponents/InfoCard';
import InfoCardContainer from '@/components/CustomComponents/InfoCardContainer';
import RolesCardCustomContainer from '@/components/CustomComponents/RoleCardCustomContainer';
import { RolesCardCustom } from '@/components/CustomComponents/RolesCardCustom';
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
