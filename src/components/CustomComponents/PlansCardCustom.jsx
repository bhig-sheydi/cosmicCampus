import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import H1 from "../Typography/H1";
import PriceConverter from "./PriceConverter";
import { useAuth } from "../Contexts/AuthContext";
import { useState } from 'react';
import SignUp from "./SignUp";

// Define the currency you want to display, for example, "NGN" or "USD"
const currency = "ALL"; // Set to "ALL" to display both currencies

// Service Plans Array
const plans = [
  {
    name: "Basic Plan",
    description: "Essential branding services for startups and small businesses.",
    regularPriceInDollars: 650.00,
    discountedPriceInDollars: 550.00,
    discountAmountInDollars: 100.00, // Corrected
    discountPercentage: 15.38, // Corrected
    services: [
      { name: "Graphic Designer", priceInDollars: 350.00 },
      { name: "Copywriter", priceInDollars: 300.00 }
    ],
  },
  {
    name: "Standard Plan",
    description: "Comprehensive branding for growing businesses.",
    regularPriceInDollars: 1050.00,
    discountedPriceInDollars: 888.51, // Corrected
    discountAmountInDollars: 161.49, // Corrected
    discountPercentage: 15.38, // Corrected
    services: [
      { name: "Graphic Designer", priceInDollars: 350.00 },
      { name: "Copywriter", priceInDollars: 300.00 },
      { name: "Songwriter & Music Producer", priceInDollars: 400.00 }
    ],
  },
  {
    name: "Premium Plan",
    description: "Top-tier branding and creative services.",
    regularPriceInDollars: 1430.00,
    discountedPriceInDollars: 1210.00, // Corrected
    discountAmountInDollars: 220.00, // Corrected
    discountPercentage: 15.38, // Corrected
    services: [
      { name: "Creative Director", priceInDollars: 400.00 },
      { name: "Graphic Designer", priceInDollars: 350.00 },
      { name: "Copywriter", priceInDollars: 300.00 },
      { name: "Videographer", priceInDollars: 380.00 },
      { name: "Songwriter & Music Producer", priceInDollars: 400.00 },
    ],
  },
];




export function PlansCardCustom() {

  const { login } = useAuth(); // Get the login state from context
  const [isSignUpVisible, setIsSignUpVisible] = useState(login);

  const handleOpenSignUp = () => {
    if(login == false)
      {setIsSignUpVisible(true);}
  };

  const handleCloseSignUp2 = () => {
    
      setIsSignUpVisible(false);
  };

  return (
    <div className="">

      {/* Conditionally render the SignUp component if login is false */}
      {  isSignUpVisible && <SignUp onClose={handleCloseSignUp2} />}
      <H1 className="text-center text-2xl">Our Service Plans</H1>
      <div className="p-5 mt-4 overflow-x-auto max-w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 min-w-[320px]">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className="w-full h-auto shadow-lg dark:shadow-pink-500 transition-transform duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl hover:shadow-purple-400"
            >
              <CardContent className="flex flex-col p-4 text-center">
                {/* Plan Name */}
                <span className="text-xl font-bold mb-2">{plan.name}</span>
                {/* Plan Description */}
                <p className="text-sm mb-3 text-gray-700 dark:text-gray-300">{plan.description}</p>
                {/* Services List */}
                <ul className="text-left mb-3 text-gray-800 dark:text-gray-200">
                  {plan.services.map((service, serviceIndex) => (
                    <li key={serviceIndex} className="text-xs mb-1">
                      <strong>{service.name}: </strong>
                      <PriceConverter priceInDollars={service.priceInDollars} currency={currency} />
                    </li>
                  ))}
                </ul>
                {/* Pricing Details */}
                <div className="text-sm font-semibold mb-3">
                  <p>Regular Price: <PriceConverter priceInDollars={plan.regularPriceInDollars} currency={currency} /></p>
                  <p className="text-red-500">Discounted Price: <PriceConverter priceInDollars={plan.discountedPriceInDollars} currency={currency} /></p>
                  <p>Discount Amount: ${plan.discountAmountInDollars.toFixed(2)}</p>
                  <p>Discount Percentage: {plan.discountPercentage}%</p>
                </div>
                {/* Hover Card */}
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button
                      variant="link"
                      
                      className="mt-2 rounded-full bg-purple-500 text-white px-2 py-1 text-xs"
                      onClick={handleOpenSignUp}
                    >
                      <PriceConverter priceInDollars={plan.discountedPriceInDollars} currency={currency} />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64 text-xs">
                    <div className="relative">
                      Discover more about the {plan.name}.
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
