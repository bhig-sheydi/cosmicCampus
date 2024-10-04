import React from 'react';
import { Lightbulb, Handshake, LineChart, Rocket, MessageCircle } from 'lucide-react';
import H1 from '../Typography/H1';
import H2 from '../Typography/H2';
import H3 from '../Typography/H3';
import P from '../Typography/P';

const WhyChooseUs = () => {
  const sections = [
    {
      icon: <Lightbulb />,
      title: 'Expertise and Experience',
      content: 'Our team consists of seasoned professionals with extensive experience in educational management, bringing valuable insights and skills to optimize school operations and student success.'
    },
    {
      icon: <Handshake />,
      title: 'Client-Centric Approach',
      content: 'Your success is our priority. We take the time to understand the unique needs of each school, offering personalized solutions that foster collaboration and growth across all institutions.'
    },
    {
      icon: <LineChart />,
      title: 'Comprehensive Solutions',
      content: 'Cosmic Campus provides a full suite of services, including data management, analytics tools, and HR solutions, ensuring all your educational needs are met under one platform.'
    },
    {
      icon: <Rocket />,
      title: 'Innovation and Creativity',
      content: 'We leverage the latest technologies and innovative practices to help schools enhance their performance, streamline processes, and stay ahead in the ever-evolving educational landscape.'
    },
    {
      icon: <MessageCircle />,
      title: 'Proven Track Record',
      content: 'Our portfolio showcases successful implementations across multiple schools, highlighting our commitment to excellence and our ability to drive measurable results.'
    }
  ];

  return (
    <div className="w-full p-8 bg-gradient-to-b from-white via-blue-50 to-pink-100 dark:from-gray-800 dark:via-purple-800 dark:to-pink-900">
      <div className="mt-16 text-center">
        <H1 className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 animate-gradient-move">
          Why Choose Us
        </H1>
        <H2 className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 animate-gradient-move">
          Your Trusted Partner in Business Growth
        </H2>
      </div>

      <div className="mt-8 space-y-8">
        {sections.map((section, index) => (
          <div
            key={index}
            className="flex flex-col items-center text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg transform transition-transform duration-300 hover:scale-105"
          >
            <div className="text-4xl text-purple-500 mb-4">
              {section.icon}
            </div>
            <H3 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 animate-gradient-move">
              {section.title}
            </H3>
            <P className="text-lg">
              {section.content}
            </P>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WhyChooseUs;
