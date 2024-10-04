import React from 'react';
import { CarouselPlugin } from './CarouselPlugin';
import H2 from '../Typography/H2';
import H1 from '../Typography/H1';
import { Card } from '../ui/card';
import {CardCustom }from './CardCustom';


const About = () => {
  return (
    <div className='w-full h-auto flex flex-col items-center mt-10 overflow-x-hidden bg-gradient-to-b from-white
     to-purple-100 dark:bg-[linear-gradient(to_bottom,_black,_#2c132e)] animate-gradient-move'>
      <H1 className='text-center mb-6 text-transparent text-center bg-clip-text bg-gradient-to-r
       from-blue-500 via-purple-400 to-purple-500 dark:from-blue-500
        dark:via-purple-600 dark:to-pink-900 animate-gradient-move'>
        About Us
      </H1>
      <div className='w-full max-w-screen-xl overflow-x-hidden'>
        <CarouselPlugin />
      </div>

    <CardCustom/>
    </div>
  );
}

export default About;
