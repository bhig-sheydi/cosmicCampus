import { Link } from "react-router-dom"; // Use React Router's Link for navigation
import { useEffect } from "react";
import {
  Bell,
  CircleUser,
  Home,
  LineChart,
  Menu,
  Package,
  Search,
  ShoppingCart,
  Users,
  
} from "lucide-react";

import { BookUserIcon } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
 import { Outlet } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Logo from "../../assets/cosmic.png";
import { useUser } from "../Contexts/userContext";
import Profile from "./Profile";
export const description =
  "A products dashboard with a sidebar navigation and a main content area. The dashboard has a header with a search input and a user menu. The sidebar has a logo, navigation links, and a card with a call to action. The main content area shows an empty state with a call to action.";

export function Dashboard() {
  const { setShowNav, roles, userData, requests } = useUser();

  useEffect(() => {
    setShowNav(1)
  
  }, []);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] ">
      {/* Sidebar */}
      <div className="hidden border-r bg-white dark:bg-black md:block ">
        
        <div className="flex h-full max-h-screen flex-col gap-2   ">
          {/* Logo & Notifications */}
          <div
            className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 bg-gradient-to-r
              from-blue-500 via-purple-500 to-pink-500 dark:from-gray-800
              dark:via-gray-700 dark:to-gray-800 shadow-md "
              
          >
            <Link to="/" className="flex items-center gap-2 font-semibold ">
              <img src={Logo} className="rounded-full w-10" />
              <span>Cosmic Campus</span>
            </Link> 
            <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 ">
          <Link
  to="/dashboard/profile"
  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 transition-all hover:text-white"
>
  <CircleUser className="h-4 w-4" />
  Profile
</Link>

<Link
  to="/dashboard/accept-requests"
  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 transition-all hover:text-white"
>
  <Users className="h-4 w-4" />
  Accept Requests
  <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500">
    {requests}
  </Badge>
</Link>

<Link
  to="/dashboard/students"
  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 transition-all hover:text-white"
>
  <BookUserIcon/>
  Students
</Link>
          </div>

          {/* Upgrade Card */}
          <div className="mt-auto p-4">
            <Card>
              <CardHeader className="p-2 pt-0 md:p-4">
                <CardTitle>Upgrade to Pro</CardTitle>
                <CardDescription>
                  Unlock all features and get unlimited access to our support
                  team.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                >
                  Upgrade
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col bg-white dark:bg-black ">
        <header
          className="flex h-14 items-center gap-4 border-b px-4 lg:h-[60px] lg:px-6 bg-gradient-to-r
            from-blue-500 via-purple-500 to-pink-500 dark:from-gray-800
            dark:via-gray-700 dark:to-gray-800 shadow-md"
        >
          <Sheet >
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col w-[100vw] ">
            <Link
  to="/dashboard/profile"
  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 transition-all hover:text-white"
>
  <CircleUser className="h-4 w-4" />
  Profile
</Link>


<Link
  to="/dashboard/students"
  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 transition-all hover:text-white"
>
  <BookUserIcon className="h-4 w-4" />
  Students

  
</Link>

<Link
  to="/dashboard/accept-requests"
  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 transition-all hover:text-white"
>
  <Users className="h-4 w-4" />
  Accept Requests
  <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500">
    {requests}
  </Badge>
</Link>

              <div className="mt-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Upgrade to Pro</CardTitle>
                    <CardDescription>
                      Unlock all features and get unlimited access to our
                      support team.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                    >
                      Upgrade
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </SheetContent>
          </Sheet>

          <div className="w-full flex-1">
            <form>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="w-full bg-white dark:bg-gray-800 pl-8 shadow-none md:w-2/3 lg:w-1/3"
                />
              </div>
            </form>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <CircleUser className="h-5 w-5" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 ">
                  

          {/* User Profile Section */}
          <Outlet/>
        </main>
      </div>
    </div>
  );
}
