import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import P from "../Typography/P";

export function CarouselPlugin() {
  const aboutContent = [
    {
      title: "What We Offer",
      services: [
        { "name": "Long-Term Data Storage", "description": "Reliable solutions for securely storing your data over time." },
        { "name": "Data Analysis Tools", "description": "Powerful tools for extracting insights from your data." },
        { "name": "Organized Information", "description": "Efficient systems for organizing and managing information." },
        { "name": "Human Resources Management", "description": "Comprehensive solutions for managing HR processes effectively." },
        { "name": "Payment Services", "description": "Streamlined payment solutions for your business needs." }
      ]
    },

    {
      title: "Our Vision",
      description: "We aim to leverage our cutting-edge data analytics technology to accurately record and analyze students’ academic and social data, providing insightful information for students, schools, guardians, and even state and national stakeholders. Our goal is to empower all parties involved with actionable insights that drive informed decision-making. By doing so, we aspire to create an academic meritocracy that recognizes and rewards genuine effort and achievement, ensuring that every student has the opportunity to excel based on their capabilities and contributions."
    },
    {
      title: "Our Mission",
      description: "Our mission is to create a dynamic global network of schools, where educators and students can connect, collaborate, and inspire one another while preserving the unique identities and traditions of each institution. We envision a world where schools from diverse backgrounds and cultures come together to share innovative practices, resources, and ideas, fostering an enriched educational experience for all. By bridging geographical divides, we aim to cultivate a spirit of unity and understanding, empowering each school to contribute its distinct voice to the global educational landscape and enhancing the learning journey for every student."
    }
  ];

  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );

  return (
    <Carousel
      plugins={[plugin.current]}
      className="w-full max-w-screen-xl mx-auto shadow-lg dark:shadow-purple-500   shadow-purple-500"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
    >
      <CarouselContent>
        {aboutContent.map((item, index) => (
          <CarouselItem 
            key={index} 
            className="flex-shrink-0 w-full h-auto md:h-[35rem] sm:h-[25rem] xs:h-[20rem]"
          >
            <div className="p-4 flex flex-col items-center justify-center w-full max-w-[100%] h-full">
              <Card className="w-full h-full flex flex-col justify-between overflow-hidden shadow-lg dark:shadow-pink-500">
                <CardContent className="flex flex-col items-center justify-start p-6 overflow-auto">
                  <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 animate-gradient-move">
                    {item.title}
                  </h2>
                  <p className="text-lg mb-4 text-gray-800 dark:text-gray-200">
                    {item.description}
                  </p>
                  {item.services && (
                    <div className="mt-2 w-full max-h-[calc(100%-6rem)] overflow-auto">
                      {item.services.map((service, idx) => (
                        <div key={idx} className="mb-4 flex flex-col">
                          <h3 className="text-xl font-semibold text-purple-500 dark:text-pink-500">
                            {service.name}
                          </h3>
                          <P className="text-black dark:text-gray-400">
                            {service.description}
                          </P>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
