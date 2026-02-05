import { Link, Outlet } from "react-router-dom";
import { useEffect } from "react";
import {
  Bell,
  CircleUser,
  LineChart,
  Menu,
  Search,
  Users,
  CheckCheckIcon,
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

export const description =
  "A products dashboard with a sidebar navigation and a main content area.";

export function Dashboard() {
  const { setShowNav, userData, requests } = useUser();
  const roleId = userData?.role_id;

  useEffect(() => {
    setShowNav(1);
  }, []);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">

      {/* ================= SIDEBAR ================= */}
      <div className="hidden border-r bg-white dark:bg-black md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">

          {/* Logo */}
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 shadow-md">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <img src={Logo} className="rounded-full w-10" />
              <span>Cosmic Campus</span>
            </Link>

            <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
              <Link to="notifications">
                <Bell className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* ========== NAVIGATION ========== */}
          <div className="flex-1">

            {/* ---- General (ALL) ---- */}
            <Link
              to="/dashboard/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white"
            >
              <CircleUser className="h-4 w-4" />
              Profile
            </Link>

            {/* ---- School (role_id === 1) ---- */}
            {roleId === 1 && (
              <>
                <Link
                  to="/dashboard/accept-requests"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white"
                >
                  <Users className="h-4 w-4" />
                  Accept Requests
                  <Badge className="ml-auto h-6 w-6 bg-red-500 flex items-center justify-center rounded-full">
                    {requests}
                  </Badge>
                </Link>

                <Link
                  to="/dashboard/students"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white"
                >
                  <BookUserIcon />
                  Students
                </Link>

                <Link
                  to="/dashboard/classsubject"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white"
                >
                  <BookUserIcon />
                  Assign Class
                </Link>

                <Link
                  to="/dashboard/teachers"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white"
                >
                  <BookUserIcon />
                  Teachers
                </Link>
              </>
            )}

            {/* ---- Teacher (role_id === 3) ---- */}
            {roleId === 3 && (

              
              <Link
                to="/dashboard/attendance"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white"
              >
                <CheckCheckIcon />
                Attendance
              </Link>,

                  <Link
                to="/dashboard/assessment"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white"
              >
                <CheckCheckIcon />
                Create Assessment
              </Link>
            )}

            {/* ---- Guardian (role_id === 4) ---- */}
            {roleId === 4 && (
              <>
                <Link
                  to="/dashboard/dependent"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white"
                >
                  <Users className="h-4 w-4" />
                  Dependents
                </Link>

                <Link
                  to="/dashboard/fee-payments"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white"
                >
                  <LineChart className="h-4 w-4" />
                  Fees
                </Link>
              </>
            )}
          </div>

          {/* Upgrade */}
          <div className="mt-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle>Upgrade to Pro</CardTitle>
                <CardDescription>
                  Unlock all features and premium support.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                  Upgrade
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ================= MAIN ================= */}
      <div className="flex flex-col bg-white dark:bg-black">
        <header className="flex h-14 items-center gap-4 border-b px-4 lg:h-[60px] lg:px-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 shadow-md">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-[100vw] flex flex-col">
              {/* SAME ROLE LOGIC AS SIDEBAR */}
              {roleId && (
                <>
                  <Link to="/dashboard/profile">Profile</Link>
                  {roleId === 1 && (
                    <>
                      <Link to="/dashboard/accept-requests">Accept Requests</Link>
                      <Link to="/dashboard/students">Students</Link>
                      <Link to="/dashboard/classsubject">Assign Class</Link>
                      <Link to="/dashboard/teachers">Teachers</Link>
                    </>
                  )}
                  {roleId === 3 && <Link to="/dashboard/attendance">Attendance</Link>}
                  {roleId === 4 && (
                    <>
                      <Link to="/dashboard/dependent">Dependents</Link>
                      <Link to="/dashboard/fee-payments">Fees</Link>
                    </>
                  )}
                </>
              )}
            </SheetContent>
          </Sheet>

          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder="Search..."
                className="pl-8 md:w-2/3 lg:w-1/3"
              />
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" className="rounded-full">
                <CircleUser className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}