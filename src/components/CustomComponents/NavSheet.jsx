import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MenuIcon } from "lucide-react";

export function NavbarSheet({ brandName, links, scrollToSection }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-purple-500 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 shadow-md">
        <SheetHeader>
          <SheetTitle className="text-white dark:text-gray-300">{brandName}</SheetTitle>
          <SheetDescription className="text-gray-100 dark:text-gray-400">
            Navigate through the site.
          </SheetDescription>
        </SheetHeader>
        <div className="flex justify-center items-center flex-col gap-4 py-4">
          {links.map((link, index) => (
            <div key={index}>
              <Button
                variant="link"
                className="text-lg font-medium text-white dark:text-gray-300 hover:underline"
                onClick={() => scrollToSection(link.id)}
              >
                {link.name}
              </Button>
            </div>
          ))}
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" className="text-white dark:text-gray-300 border-white dark:border-gray-300">
              Close
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
