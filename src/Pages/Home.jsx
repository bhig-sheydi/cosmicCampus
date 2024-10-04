import React from 'react';
import HeroContainer from '@/components/CustomComponents/HeroContainer';
import AboutContainer from '@/components/CustomComponents/AboutContainer';
import WhyChooseUsContainer from '@/components/CustomComponents/WhyChoseUsContainer';
import FAQsContainer from '@/components/CustomComponents/FAQsContainer';
import { Navbar } from '../components/CustomComponents/Navbar';

const Home = () => {
  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const links = [
    { name: 'Hero', id: 'hero-section' },
    { name: 'About', id: 'about-section' },
    { name: 'Why Choose Us', id: 'why-choose-us-section' },
    { name: 'FAQs', id: 'faqs-section' },
  ];

  return (
    <div>
      <Navbar brandName="Your Brand" links={links} scrollToSection={scrollToSection} />
      <div id="hero-section">
        <HeroContainer />
      </div>
      <div id="about-section">
        <AboutContainer />
      </div>
      <div id="why-choose-us-section">
        <WhyChooseUsContainer />
      </div>
      <div id="faqs-section">
        <FAQsContainer />
      </div>
    </div>
  );
};

export default Home;
