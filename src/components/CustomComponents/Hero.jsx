import React, { useEffect } from 'react';
import H1 from '../Typography/H1';
import { Button } from '../ui/button';
import H4 from '../Typography/H4';
import Logo from "../../assets/cosmic.png";
import { Link } from 'react-router-dom';

const Hero = () => {
  useEffect(() => {
    const blobs = document.querySelectorAll('.floating-blob');
    const colors = [
      "linear-gradient(to bottom right, #3b82f6, transparent)", // Blue
      "linear-gradient(to bottom right, #9333ea, transparent)", // Purple
      "linear-gradient(to bottom right, #ec4899, transparent)"  // Pink
    ];

    const animateBlobs = () => {
      blobs.forEach((blob) => {
        const randomX = (Math.random() - 0.5) * 200;
        const randomY = (Math.random() - 0.5) * 200;
        const randomGradient = colors[Math.floor(Math.random() * colors.length)];

        blob.style.transform = `translate(${randomX}px, ${randomY}px)`;
        blob.style.backgroundImage = randomGradient;
        blob.style.transition = 'transform 4s ease-in-out, background-image 2s ease-in-out';
      });
    };

    const interval = setInterval(animateBlobs, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='w-full flex items-center justify-center shadow-md h-[87vh] relative mt-24 dark:bg-black overflow-hidden'>
      {/* Floating Blobs */}
      <div className="floating-blob absolute w-1/2 h-1/2 opacity-30 blur-3xl animate-float1"
        style={{ clipPath: "polygon(10% 70%, 20% 20%, 90% 30%, 70% 90%)", top: "5%", left: "10%" }}>
      </div>
      <div className="floating-blob absolute w-1/3 h-1/3 opacity-30 blur-3xl animate-float2"
        style={{ clipPath: "polygon(5% 80%, 25% 10%, 80% 40%, 90% 100%)", top: "40%", right: "5%" }}>
      </div>
      <div className="floating-blob absolute w-1/3 h-1/3 opacity-30 blur-3xl animate-float3"
        style={{ clipPath: "polygon(15% 60%, 30% 10%, 70% 50%, 85% 90%)", bottom: "5%", left: "35%" }}>
      </div>

      <div className='flex flex-col items-center justify-center gap-7 relative z-10'>
        <div className="relative">
          {/* Rotating Logo */}
          <img src={Logo} className='w-32 rounded-full animate-rotate-3d relative z-10' alt="Cosmic Campus Logo" />

          {/* Moving Shadow */}
          <div className="w-32 h-8 absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-2 rounded-full bg-black/30 dark:bg-purple-500/50 blur-md opacity-75 animate-shadow-rotate"></div>
        </div>
        <H1 className="text-transparent text-center bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 animate-gradient-move">
          Welcome To Cosmic Campus
        </H1>
        <div className='w-full flex flex-col justify-center items-center gap-7'>
          <H4 className='text-center'>Join Our Cosmic Journey</H4>
          <Link to={'/signup'}>
            <Button className="bg-gradient-to-l from-blue-500 via-purple-500 to-pink-500 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 animate-gradient-move">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Hero;
