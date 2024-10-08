import { NavbarSheet } from "./NavSheet"; // Adjust the import path as needed
import { ModeToggle } from "./mode-toggle";
import Logo from "../../assets/cosmic.png";
import H4 from "../Typography/H4";
import { useUser } from "../Contexts/userContext";
import { Button } from "../ui/button";

export function Navbar({ links = [], brandName = "BrandName", scrollToSection }) {

  const {userData ,logout , showNav} = useUser()


  console.log(userData)
  return (
     <div>
      {
        showNav  == 0 &&(

          <nav className="fixed top-0 left-0 z-50 flex justify-between items-center bg-gradient-to-r p-7 w-full 
          from-blue-500 via-purple-500 to-pink-500 dark:from-gray-800
           dark:via-gray-700 dark:to-gray-800 shadow-md 
          animate-gradient-move">
            <div className="flex items-center gap-2">
            <img src={Logo} alt="" className="w-11 rounded-full" />
            <H4>Cosmic Campus</H4>
            </div>
             <div className="flex items-center gap-8 pr-7">
             <NavbarSheet brandName={brandName} links={links} scrollToSection={scrollToSection} />
             <ModeToggle />
             <Button className="bg-white text-black" onClick={logout}>Log Out</Button>
             <h1>{userData?.name}</h1>
             
             </div>
         </nav>
        )
      }
     </div>
  );
}
