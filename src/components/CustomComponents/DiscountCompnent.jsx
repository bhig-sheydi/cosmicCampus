import * as React from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { PlansCardCustom } from "./PlansCardCustom";
import DiscountButtonContainer from "./DiscountButtonContainer";

export function DiscountComponent() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
      <div className="flex items-center justify-center m-5 w-full">
      <Button variant={"outline"} className=" h-24 w-[60%] rounded-full p-0">
     <DiscountButtonContainer/>
      </Button>
      </div>
      </DrawerTrigger>
      <DrawerContent>
        <div className="w-full h-full">
          <DrawerHeader>
            <DrawerTitle>All Hands On Deck</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 h-[calc(100vh-15rem)] overflow-y-auto">
            <div className="text-center w-full">
              <PlansCardCustom />
            </div>
          </div>
          <DrawerClose asChild>
              <div className="flex items-center justify-center">
              <Button variant="outline" className=" h-24 text-lg rounded-full shadow-md shadow-purple-500 items-center bg-gradient-to-r pt-3 w-[60%] 
     from-blue-500 via-purple-500 to-pink-500 shadow-md 
     animate-gradient-move m-3 flex items-center justify-center">Close Discounts </Button>
              </div>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
