import { useEffect, useRef } from 'react';
import Logo from "../../assets/cosmic.png";
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useMediaQuery } from 'react-responsive';

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  const videoRef = useRef(null);
  const rootRef = useRef(null);
  const isMobile = useMediaQuery({ maxWidth: 767 });

  useEffect(() => {
    const video = videoRef.current;
    const root = rootRef.current;
    if (!video || !root) return;

    // Parallax transform of the video for a smooth background movement
    const tween = gsap.to(video, {
      yPercent: isMobile ? -6 : -12,
      ease: 'none',
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6,
      },
    });

    return () => {
      if (tween) tween.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [isMobile]);

  return (
    <section id="hero" className="relative w-full pt-24 py-20 min-h-[70vh] overflow-hidden">
      {/* Background video (absolute, behind content) */}
      <div className="absolute video inset-0 -z-10">
        <video
          ref={videoRef}
          className="w-full h-full object-cover "
          src="/videos/output.mp4"
          muted
          playsInline
          preload="auto"
        />
        {/* Overlay for contrast */}
        <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
      </div>

      <div className="container mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-8 items-center relative z-10">
        <div className="max-w-2xl leading-snug">
          <h1 className="text-4xl lg:text-6xl md:text-3xl font-heading leading-tight text-white">
            <span className="block hero-line">Welcome to</span>
            <span className="block hero-line">Cosmic</span>
            <span className="block hero-line">Campus:</span>
            <span className="block hero-line">Where</span>
            <span className="block hero-line">Learning</span>
            <span className="block hero-line">Thrives</span>
          </h1>

          <p className="mt-6 text-lg text-white/85 hero-copy">
            At Cosmic Campus, we are dedicated to fostering academic excellence while
            nurturing the whole child. Our vibrant community encourages exploration in both
            academics and extracurricular activities, ensuring a well-rounded education.
          </p>

          <div className="mt-6 hero-ctas flex gap-4">
            <button className='text-gray-200 hover:bg-black text-2xl'>Learn More</button>
            
            <button className=' text-2xl text-gray-200'>Sign Up</button>
          </div>
        </div>

        <aside className="hero-aside flex justify-end">
          <img src={Logo} alt="Cosmic" className="w-64 h-64 object-contain rounded-md shadow-lg" />
        </aside>
      </div>
    </section>
  );
};

export default Hero;

