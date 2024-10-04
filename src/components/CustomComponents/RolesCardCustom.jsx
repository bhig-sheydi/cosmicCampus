import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import H1 from "../Typography/H1";
import PriceConverter from "./PriceConverter";

// Roles and Subroles Array
const roles = [
  {
    name: "Creative Director",
    description: "Leads the development of the visual and creative aspects of the brand.",
    priceInDollars: 400.00,
    subroles: [
      { name: "Art Director", description: "Manages the overall visual style and imagery.", priceInDollars: 350.00 },
      { name: "Design Manager", description: "Oversees design projects and ensures brand consistency.", priceInDollars: 320.00 },
      { name: "Visual Strategist", description: "Develops creative strategies aligned with brand goals.", priceInDollars: 300.00 },
    ],
  },
  {
    name: "Graphic Designer",
    description: "Responsible for creating the visual components of the brand.",
    priceInDollars: 350.00,
    subroles: [
      { name: "Logo Designer", description: "Designs logos that represent the brand identity.", priceInDollars: 300.00 },
      { name: "UI/UX Designer", description: "Creates user-friendly interfaces for websites and apps.", priceInDollars: 350.00 },
      { name: "Print Designer", description: "Designs brochures, posters, and other print materials.", priceInDollars: 250.00 },
    ],
  },
  {
    name: "Copywriter",
    description: "Crafts the written content that conveys the brand's message.",
    priceInDollars: 300.00,
    subroles: [
      { name: "Content Writer", description: "Writes blog posts, articles, and website content.", priceInDollars: 200.00 },
      { name: "Ad Copywriter", description: "Creates engaging and persuasive ad copy.", priceInDollars: 250.00 },
      { name: "SEO Specialist", description: "Optimizes content for search engines.", priceInDollars: 300.00 },
    ],
  },
  {
    name: "Songwriter & Music Producer",
    description: "Responsible for creating catchy jingles that resonate with the brand’s identity.",
    priceInDollars: 400.00,
    subroles: [
      { name: "Jingle Writer", description: "Composes music for commercials and branding.", priceInDollars: 350.00 },
      { name: "Music Composer", description: "Creates original music to align with brand tone.", priceInDollars: 300.00 },
      { name: "Sound Designer", description: "Designs sound effects and audio branding.", priceInDollars: 250.00 },
    ],
  },
  {
    name: "Videographer",
    description: "Produces engaging visual content that tells the brand's story.",
    priceInDollars: 380.00,
    subroles: [
      { name: "Video Editor", description: "Edits footage to create cohesive and compelling videos.", priceInDollars: 300.00 },
      { name: "Cinematographer", description: "Captures high-quality video footage.", priceInDollars: 350.00 },
      { name: "Motion Graphics Designer", description: "Creates animated content for videos.", priceInDollars: 320.00 },
    ],
  },
];

const currency = "ALL"; // Set to "ALL" to display both currencies

export function RolesCardCustom() {
  return (
    <div className="pt-11">
      <H1 className="text-center">Hands On Deck</H1>
      <div className="p-5 mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
        {roles.map((role, index) => (
          <Card
            key={index}
            className="w-full h-auto shadow-lg dark:shadow-pink-500 transition-transform duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl hover:shadow-purple-400"
          >
            <CardContent className="flex flex-col p-6 text-center">
              {/* Role Name */}
              <span className="text-2xl font-bold mb-4">{role.name}</span>
              {/* Role Description */}
              <p className="text-base mb-6 text-gray-700 dark:text-gray-300">{role.description}</p>
              {/* Subroles List */}
              <ul className="text-left mb-4 text-gray-800 dark:text-gray-200">
                {role.subroles.map((subrole, subIndex) => (
                  <li key={subIndex} className="mb-2">
                    <strong>{subrole.name}: </strong>{subrole.description}
                  </li>
                ))}
              </ul>
              {/* Hover Card */}
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button
                    variant="link"
                    className="mt-4 rounded-full bg-purple-500 text-white px-4 py-2"
                  >
                    <PriceConverter priceInDollars={role.priceInDollars} currency={currency} />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="text-sm relative">
                    Discover more about the {role.name} role and its importance in branding.
                  </div>
                </HoverCardContent>
              </HoverCard>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
