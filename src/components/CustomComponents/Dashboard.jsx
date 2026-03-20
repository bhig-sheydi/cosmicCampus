import { Link, Outlet } from "react-router-dom";
import { useEffect } from "react";
import {
  Bell,
  CircleUser,
  Menu,
  Search,
  Users,
  CheckCheck,
  Wallet,
  Trophy,
  Eye,
  BookOpen,
  ShoppingCart,
  UserPlus,
  GraduationCap,
  ClipboardList,
  FileText,
  PenTool,
  LayoutDashboard,
  School,
  UserCog,
  PlusCircle,
  Award,
  Lock,
  Monitor
} from "lucide-react";
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
    <div className="flex min-h-screen w-full bg-white dark:bg-black">
      {/* ================= SIDEBAR (DESKTOP) - FIXED POSITION ================= */}
      <div className="hidden md:block w-[220px] lg:w-[280px] flex-shrink-0">
        <div className="fixed top-0 left-0 h-screen w-[220px] lg:w-[280px] border-r bg-white dark:bg-black flex flex-col gap-2 overflow-hidden">
          {/* Logo */}
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 shadow-md flex-shrink-0">
            <Link to="/" className="flex items-center gap-2 font-semibold text-white">
              <img src={Logo} className="rounded-full w-10" alt="Logo" />
              <span className="text-sm lg:text-base">Cosmic Campus</span>
            </Link>

            <Button variant="outline" size="icon" className="ml-auto h-8 w-8 bg-white/20 border-white/30">
              <Link to="notifications">
                <Bell className="h-4 w-4 text-white" />
              </Link>
            </Button>
          </div>

          {/* ========== NAVIGATION - SCROLLABLE ========== */}
          <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
            {/* ---- General (ALL) ---- */}
            <nav className="space-y-1">
              <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                General
              </div>
              <Link
                to="/dashboard/profile"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
              >
                <CircleUser className="h-4 w-4" />
                Profile
              </Link>
            </nav>

            {/* ---- School Administration (role_id === 1) ---- */}
            {roleId === 1 && (
              <nav className="space-y-1">
                <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  School Administration
                </div>
                
                <Link
                  to="/dashboard/school-dashboard"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>

                <Link
                  to="/dashboard/accept-requests"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  Accept Requests
                  {requests > 0 && (
                    <Badge className="ml-auto h-5 w-5 bg-red-500 flex items-center justify-center rounded-full text-[10px]">
                      {requests}
                    </Badge>
                  )}
                </Link>

                <Link
                  to="/dashboard/students"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <GraduationCap className="h-4 w-4" />
                  Students
                </Link>

                <Link
                  to="/dashboard/teachers"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <UserCog className="h-4 w-4" />
                  Teachers
                </Link>

                <Link
                  to="/dashboard/classsubject"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <School className="h-4 w-4" />
                  Assign Class
                </Link>

                <Link
                  to="/dashboard/createBatch"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create Batch
                </Link>
              </nav>
            )}

            {/* ---- Student (role_id === 2) ---- */}
            {roleId === 2 && (
              <nav className="space-y-1">
                <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Student Portal
                </div>
                
                <Link
                  to="/dashboard/c_assessment"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <Award className="h-4 w-4" />
                  Progress & Assessment
                </Link>

                <Link
                  to="/dashboard/take_assessment"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <CheckCheck className="h-4 w-4" />
                  Take Assessment
                </Link>

                <Link
                  to="/dashboard/note-reader"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <BookOpen className="h-4 w-4" />
                  Notes & Textbooks
                </Link>
              </nav>
            )}

            {/* ---- Teacher (role_id === 3) ---- */}
            {roleId === 3 && (
              <nav className="space-y-1">
                <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Teacher Tools
                </div>
                
                <Link
                  to="/dashboard/attendance"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <ClipboardList className="h-4 w-4" />
                  Attendance
                </Link>

                <Link
                  to="/dashboard/assessment"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <FileText className="h-4 w-4" />
                  Create Assessment
                </Link>

                <Link
                  to="/dashboard/monitoring"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <Monitor className="h-4 w-4" />
                  Monitor Tests
                </Link>

                <Link
                  to="/dashboard/note-editor"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <PenTool className="h-4 w-4" />
                  Create Note
                </Link>
              </nav>
            )}

            {/* ---- Guardian (role_id === 4) ---- */}
            {roleId === 4 && (
              <nav className="space-y-1">
                <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Parent Portal
                </div>
                
                <Link
                  to="/dashboard/dependent"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  Create Child Account
                </Link>

                <Link
                  to="/dashboard/fee-payments"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <Wallet className="h-4 w-4" />
                  Fee Payments
                </Link>

                <Link
                  to="/dashboard/leaders"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <Trophy className="h-4 w-4" />
                  Class Ranking
                </Link>

                <Link
                  to="/dashboard/resetStudentPassword"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <Lock className="h-4 w-4" />
                  Reset Child Password
                </Link>

                <Link
                  to="/dashboard/childshomework"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <Eye className="h-4 w-4" />
                  Monitor Homework
                </Link>

                <Link
                  to="/dashboard/place-order"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Place Order
                </Link>
              </nav>
            )}

          </div>

          {/* Upgrade */}
          <div className="mt-auto p-4 flex-shrink-0">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm">Upgrade to Pro</CardTitle>
                <CardDescription className="text-xs">
                  Unlock all features and premium support.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Button className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-sm">
                  Upgrade
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ================= MAIN CONTENT - SCROLLABLE ================= */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto bg-white dark:bg-black">
        
        {/* Header - Sticky */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b px-4 lg:h-[60px] lg:px-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 shadow-md">
          
          {/* Mobile Menu Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden bg-white/20 border-white/30">
                <Menu className="h-5 w-5 text-white" />
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-[300px] p-0 bg-white dark:bg-black">
              <div className="flex flex-col h-full">
                
                {/* Mobile Logo */}
                <div className="flex h-14 items-center border-b px-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                  <Link to="/" className="flex items-center gap-2 font-semibold text-white">
                    <img src={Logo} className="rounded-full w-8" alt="Logo" />
                    <span className="text-sm">Cosmic Campus</span>
                  </Link>
                </div>

                {/* Mobile Navigation */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                  
                  {/* General */}
                  <nav className="space-y-1">
                    <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      General
                    </div>
                    <Link
                      to="/dashboard/profile"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                    >
                      <CircleUser className="h-4 w-4" />
                      Profile
                    </Link>
                  </nav>

                  {/* School Admin */}
                  {roleId === 1 && (
                    <nav className="space-y-1">
                      <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        School Administration
                      </div>
                      
                      <Link
                        to="/dashboard/school-dashboard"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>

                      <Link
                        to="/dashboard/accept-requests"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <UserPlus className="h-4 w-4" />
                        Accept Requests
                        {requests > 0 && (
                          <Badge className="ml-auto h-5 w-5 bg-red-500 flex items-center justify-center rounded-full text-[10px]">
                            {requests}
                          </Badge>
                        )}
                      </Link>

                      <Link
                        to="/dashboard/students"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <GraduationCap className="h-4 w-4" />
                        Students
                      </Link>

                      <Link
                        to="/dashboard/teachers"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <UserCog className="h-4 w-4" />
                        Teachers
                      </Link>

                      <Link
                        to="/dashboard/classsubject"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <School className="h-4 w-4" />
                        Assign Class
                      </Link>

                      <Link
                        to="/dashboard/createBatch"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Create Batch
                      </Link>
                    </nav>
                  )}

                  {/* Student */}
                  {roleId === 2 && (
                    <nav className="space-y-1">
                      <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Student Portal
                      </div>
                      
                      <Link
                        to="/dashboard/c_assessment"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <Award className="h-4 w-4" />
                        Progress & Assessment
                      </Link>

                      <Link
                        to="/dashboard/take_assessment"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <CheckCheck className="h-4 w-4" />
                        Take Assessment
                      </Link>

                      <Link
                        to="/dashboard/note-reader"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <BookOpen className="h-4 w-4" />
                        Notes & Textbooks
                      </Link>
                    </nav>
                  )}

                  {/* Teacher */}
                  {roleId === 3 && (
                    <nav className="space-y-1">
                      <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Teacher Tools
                      </div>
                      
                      <Link
                        to="/dashboard/attendance"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <ClipboardList className="h-4 w-4" />
                        Attendance
                      </Link>

                      <Link
                        to="/dashboard/assessment"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <FileText className="h-4 w-4" />
                        Create Assessment
                      </Link>

                      <Link
                        to="/dashboard/monitoring"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <Monitor className="h-4 w-4" />
                        Monitor Tests
                      </Link>

                      <Link
                        to="/dashboard/note-editor"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <PenTool className="h-4 w-4" />
                        Create Note
                      </Link>
                    </nav>
                  )}

                  {/* Guardian */}
                  {roleId === 4 && (
                    <nav className="space-y-1">
                      <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Parent Portal
                      </div>
                      
                      <Link
                        to="/dashboard/dependent"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <UserPlus className="h-4 w-4" />
                        Create Child Account
                      </Link>

                      <Link
                        to="/dashboard/fee-payments"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <Wallet className="h-4 w-4" />
                        Fee Payments
                      </Link>

                      <Link
                        to="/dashboard/leaders"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <Trophy className="h-4 w-4" />
                        Class Ranking
                      </Link>

                      <Link
                        to="/dashboard/resetStudentPassword"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <Lock className="h-4 w-4" />
                        Reset Child Password
                      </Link>

                      <Link
                        to="/dashboard/childshomework"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <Eye className="h-4 w-4" />
                        Monitor Homework
                      </Link>

                      <Link
                        to="/dashboard/place-order"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white transition-all"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Place Order
                      </Link>
                    </nav>
                  )}

                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/70" />
              <Input
                placeholder="Search..."
                className="pl-8 md:w-2/3 lg:w-1/3 bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white/30"
              />
            </div>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" className="rounded-full bg-white/20 border-white/30 hover:bg-white/30">
                <CircleUser className="h-5 w-5 text-white" />
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

        {/* Main Content Area - Scrolls independently */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}