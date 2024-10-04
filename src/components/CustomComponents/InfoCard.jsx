import React from 'react';
import H1 from '../Typography/H1';
import P from '../Typography/P';
import Q from '../Typography/Q'; // Adjust the import path as needed
import H2 from '../Typography/H2';
import { Star, Info, Quote as QuoteIcon } from 'lucide-react'; // Importing icons from lucide-react

const InfoCard = () => {
  return (
    <div className='king'>
      <div className="p-8 max-w-4xl mx-auto bg-gradient-to-r from-purple-100 via-white to-purple-100 dark:from-purple-900 dark:via-gray-800 dark:to-purple-900 rounded-lg shadow-lg">
        <H1 className='text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 animate-gradient-move mb-6'>
          <Star className="inline-block mr-2 text-yellow-400" /> What Is Branding?
        </H1>

        <p className="text-center text-lg text-gray-800 dark:text-gray-200 mb-8">
          <Info className="inline-block mr-2 text-blue-500 dark:text-blue-300" />
          Branding is a crucial aspect of your business identity. It involves creating a unique name, design, symbol, and image that sets your product or service apart from others.
        </p>

        <Q className="text-xl text-gray-800 dark:text-gray-200 mb-8">
          <QuoteIcon className="inline-block mr-2 text-gray-600 dark:text-gray-400" />
          "Branding is the process of creating a unique name, design, symbol, and image that identifies a product or service and differentiates it from others. It encompasses the entire process of developing and maintaining a brand, including the identity, positioning, and management of the brand over time."
          <span className="block text-sm text-gray-600 dark:text-gray-400 mt-4">
            - American Marketing Association (AMA)
          </span>
        </Q>

        <div className='mt-12'>
          <H2 className='text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 animate-gradient-move mb-6'>
            <Star className="inline-block mr-2 text-yellow-400" /> Something Beyond Branding<i>!</i>
          </H2>

          <P className='text-lg text-gray-800 dark:text-gray-200'>
            <Info className="inline-block mr-2 text-blue-500 dark:text-blue-300" />
            At Walking Universe Enterprise, branding is more than just a logo or a catchy slogan—it's the heart and soul of your business. It's how you tell your story, connect with your audience, and differentiate yourself from the competition. We are passionate about your growth and committed to creating a brand that resonates and stands out in the market.
          </P>
        </div>
      </div>
    </div>
  );
};

export default InfoCard;
