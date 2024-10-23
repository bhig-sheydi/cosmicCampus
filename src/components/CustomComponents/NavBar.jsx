import { NavbarSheet } from "./NavSheet"; // Adjust path as needed
import { ModeToggle } from "./mode-toggle";
import Logo from "../../assets/cosmic.png";
import H4 from "../Typography/H4";
import { useUser } from "../Contexts/userContext";
import { Button } from "../ui/button";
import { useState } from "react";


export function Navbar({ links = [], brandName = "BrandName", scrollToSection }) {
  const { userData, logout, showNav } = useUser();
  const [isNavOpen, setNavOpen] = useState(false);


  // Function to close the mobile navbar
  const handleLinkClick = () => {
    setNavOpen(false);
  };

  return (
    <div>
      {showNav === 0 && (
        <nav
          className="fixed top-0 left-0 z-50 w-full bg-gradient-to-r 
                     from-blue-500 via-purple-500 to-pink-500 dark:from-gray-800 
                     dark:to-gray-900 shadow-lg transition-all animate-gradient-move"
        >
          <div className="flex justify-between items-center p-5">
            {/* Brand Section */}
            <div className="flex items-center gap-3">
              <img src={Logo} alt="Cosmic Logo" className="w-12 rounded-full" />
              <H4 className="hidden sm:block text-white">Cosmic Campus</H4>
            </div>

            {/* Hamburger Button for Mobile */}
            <button
              className="sm:hidden p-2 bg-white/30 rounded-md backdrop-blur-md text-white"
              onClick={() => setNavOpen(!isNavOpen)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={
                    isNavOpen
                      ? "M6 18L18 6M6 6l12 12"
                      : "M3.75 5.25h16.5M3.75 12h16.5M3.75 18.75h16.5"
                  }
                />
              </svg>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center gap-8">
              <NavbarSheet brandName={brandName} links={links} scrollToSection={scrollToSection} />
              <ModeToggle className="w-auto" />
              <Button className="bg-white text-black" onClick={logout}>
                Log Out
              </Button>
              <h1 className="text-white">Welcome, {userData?.name || "Guest"}!</h1>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div
            className={`${
              isNavOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
            } overflow-hidden transition-all duration-500 ease-in-out 
              bg-white dark:bg-gray-900 shadow-md sm:hidden`}
          >
            <div className="p-5 flex flex-col gap-4">
              <h1 className="text-center text-black dark:text-white">
                Welcome, {userData?.name || "Guest"}!
              </h1>
              <NavbarSheet
                brandName={brandName}
                links={links}
                scrollToSection={scrollToSection}
                onLinkClick={handleLinkClick} // Pass the close function
              />
              <Button className="bg-black text-white w-full" onClick={logout}>
                Log Out
              </Button>
              <ModeToggle className="w-full" />
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
