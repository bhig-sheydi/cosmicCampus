"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "../ui/carousel";

const AutoCarousel = ({ items, renderSlide, delay = 3000, totalPages = 1 }) => {
  const autoplayRef = useRef(Autoplay({ delay, stopOnInteraction: true }));
  const [currentPage, setCurrentPage] = useState(0);
  const [emblaApi, setEmblaApi] = useState(null);
  const emblaRef = useRef(null);


  useEffect(() => {
    if (!emblaApi) return;
  
    const onSelect = () => {
      const selectedPage = emblaApi.selectedScrollSnap();
      console.log("Current Page:", selectedPage); // Debugging
      setCurrentPage(selectedPage);
    };
  
    emblaApi.on("select", onSelect);
    onSelect(); // Initialize current page
  
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi]);
  

  // Set embla instance when available
  useEffect(() => {
    if (emblaRef.current) {
      setEmblaApi(emblaRef.current.emblaApi);
    }
  }, []);

  // Listen for page changes
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setCurrentPage(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    onSelect(); // Initialize current page

    return () => emblaApi.off("select", onSelect);
  }, [emblaApi]);

  // Handle dot navigation
  const handleSelect = (index) => {
    if (emblaApi) emblaApi.scrollTo(index);
  };

  return (
    <div className="relative w-full">
      <Carousel
        plugins={[autoplayRef.current]}
        className="w-full max-w-screen-xl mx-auto shadow-lg dark:shadow-purple-500 shadow-purple-500"
        onMouseEnter={autoplayRef.current.stop}
        onMouseLeave={autoplayRef.current.reset}
        ref={emblaRef}
      >
        <CarouselContent>
          {items.map((item, index) => (
            <CarouselItem key={index} className="w-full h-auto flex-shrink-0">
              <div className="p-4 flex flex-col items-center justify-center w-full h-full">
                {renderSlide(item, index)}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>

      {/* Pagination Dots */}
      <div className="flex justify-center mt-4 space-x-2">
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full transition ${
              index === currentPage ? "bg-purple-500 scale-125" : "bg-gray-400"
            }`}
            onClick={() => handleSelect(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default AutoCarousel;
