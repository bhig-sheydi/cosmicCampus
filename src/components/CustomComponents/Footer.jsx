import React from 'react';
import { FacebookIcon, TwitterIcon, InstagramIcon, GithubIcon } from 'lucide-react';
import P from '../Typography/P';
import H2 from '../Typography/H2';
import H1 from '../Typography/H1';


const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 p-8">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Brand Section */}
        <div>
          <H1 className="text-white">Walking Universe Enterprise</H1>
          <P className="mt-4">
            Empowering businesses with innovative solutions, digital marketing, and growth tools. Your success is our priority.
          </P>
        </div>

        {/* Navigation Links */}
        <div>
          <H2 className="text-white mb-4">Quick Links</H2>
          <ul>
            <li className="mb-2"><a href="/" className="hover:text-pink-500 transition">Home</a></li>
            <li className="mb-2"><a href="/about" className="hover:text-pink-500 transition">About Us</a></li>
            <li className="mb-2"><a href="/services" className="hover:text-pink-500 transition">Services</a></li>
            <li className="mb-2"><a href="/contact" className="hover:text-pink-500 transition">Contact</a></li>
          </ul>
        </div>

        {/* Social Media Icons */}
        <div>
          <H2 className="text-white mb-4">Follow Us</H2>
          <div className="flex space-x-4">
            <a href="https://facebook.com" className="hover:text-pink-500 transition"><FacebookIcon /></a>
            <a href="https://twitter.com" className="hover:text-pink-500 transition"><TwitterIcon /></a>
            <a href="https://instagram.com" className="hover:text-pink-500 transition"><InstagramIcon /></a>
            <a href="https://github.com" className="hover:text-pink-500 transition"><GithubIcon /></a>
          </div>
        </div>

      </div>

      {/* Bottom Section */}
      <div className="mt-8 border-t border-gray-700 pt-4 text-center">
        <P className="text-gray-500">&copy; 2024 Walking Universe Enterprise. All rights reserved.</P>
      </div>
    </footer>
  );
};

export default Footer;
