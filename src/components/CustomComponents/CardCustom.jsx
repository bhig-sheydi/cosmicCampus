import * as Components from "@/components/ui/card"; // Fixed import statement
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

// Pricing tiers object
const pricingTiers = [
  {
    title: "Demo",
    price: "#0",
    features: [
      "100 students",
      "result checking",
      "school timetable",
      "Homework notification parents/students",
    ],
  },
  {
    title: "Basic",
    price: "#1000/Student per semester",
    features: [
      "sports records",
      "result checking",
      "result analysis",
      "attendance records",
      "unlimited students",
      "overall school ranking",
      "class specific timetable",
      "historical school ranking",
      "Staff management dashboard",
      "social/sports events records/analysis ",
      "Homework notification parents/students",
    
    ],
  },
  {
    title: "Pro",
    price: "2000/student per semester",
    features: [
   
     "sports records",
      "result analysis",
      "result checking",
      "unlimited students",
      "attendance records",
      "overall school ranking",
      "class specific timetable",
      "sign-in/sign-out of staff ",
      "historical school ranking",
      "Staff management dashboard",
      "realtime scores and ranking update",
      "social/sports events records/analysis ",
      "Homework notification parents/students",
    ],
  },
];

export function CardCustom() {
  const navigate = useNavigate();

  return (
    <div className="p-5 mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
      {pricingTiers.map((tier, index) => (
        <Card
          key={index}
          className="w-full h-auto shadow-lg dark:shadow-pink-500 transition-transform duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl hover:shadow-purple-400"
        >
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            {/* Tier Title */}
            <span className="text-2xl font-bold">{tier.title}</span>
            {/* Price */}
            <span className="text-3xl font-semibold mt-2">{tier.price}</span>
            {/* Features List */}
            <ul className="mt-4 text-base">
              {tier.features.map((feature, i) => (
                <li key={i} className="mt-2">
                  - {feature}
                </li>
              ))}
            </ul>

            {/* Hover Card */}
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button
                  variant="link"
                  className="mt-4 rounded-full bg-purple-500 text-white px-4 py-2 w-40"
                  onClick={() => navigate(`/pricing/${tier.title.toLowerCase()}`)} // Navigate to the respective tier route
                >
                  Get Started
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="text-sm">
                  {`Choose the ${tier.title} plan to get started!`}
                </div>
              </HoverCardContent>
            </HoverCard>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
