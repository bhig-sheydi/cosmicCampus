import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export function CosmicCarouselPlugin() {
  const slides = [
    "Your Child’s Safety Is Our Utmost Priority",
    "Send Requests Responsibly: Only send requests for children who are yours.",
    "Ensure Your Child Is Present: Make sure your child is with you while sending the request.",
    "Stay Connected: This feature helps you stay informed about your child’s daily school activities.",
    "Quick Responses: Requests are processed quickly, ensuring a seamless experience.",
  ];

  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );

  return (
    <div className="w-full py-8">
      <Carousel
        plugins={[plugin.current]}
        className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-3xl mx-auto overflow-hidden shadow-lg dark:shadow-purple-500 shadow-purple-500"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent>
          {slides.map((text, index) => (
            <CarouselItem
              key={index}
              className="flex-shrink-0 w-full h-[15rem] sm:h-[20rem] md:h-[25rem] lg:h-[30rem]"
            >
              <div className="flex items-center justify-center w-full h-full bg-gradient-to-r from-blue-400 via-purple-300 to-pink-500 dark:from-purple-800 dark:via-pink-600 dark:to-red-500 text-white">
                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-center px-4">
                  {text}
                </h2>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
