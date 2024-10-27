// src/App.js

import React from 'react';
import { Routes, Route, BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './components/Contexts/ThemeProvider';
import { AuthProvider } from './components/Contexts/AuthContext'; // Import the AuthProvider
import Home from './Pages/Home';
import Branding from './Pages/Branding';
import WebsiteDesign from './Pages/WebsiteDesign';
import DigitalMarketing from './Pages/DigitalMarketing';
import BusinessStrategies from './Pages/BusinessStrategies';
import GraphicDesign from './Pages/GraphicDesign';
import GrowthTools from './Pages/GrowthTools';
import DashboardTest from './Pages/DashboardTest';
import Footer from './components/CustomComponents/Footer';
import NavContainer from './components/CustomComponents/NavContainer';
import { SignUp } from './components/CustomComponents/SignupForm';
import Auth from './components/Auth';
import { Toaster } from "@/components/ui/toaster";
import { Login } from './components/CustomComponents/LogIn';
import { Dashboard } from './components/CustomComponents/Dashboard';
import AcceptRequests from './components/CustomComponents/AcceptRequest';
import Profile from './components/CustomComponents/Profile';
import StudentsList from './components/CustomComponents/StudentList';




function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
     
      <AuthProvider>
      <Toaster /> 
        <Router>
          <NavContainer />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/branding" element={<Branding />} />
            <Route path="/website-design" element={<WebsiteDesign />} />
            <Route path="/digital-marketing" element={<DigitalMarketing />} />
            <Route path="/business-strategies" element={<BusinessStrategies />} />
            <Route path="/graphic-design" element={<GraphicDesign />} />
            <Route path="/growth-tools" element={<GrowthTools />} />
             <Route path="/signup" element={<SignUp />} />
             <Route path="/login" element={<Login/>} />
             <Route path="/otp" element={<Auth/>} />
            <Route path="/db" element={<DashboardTest />} />
            
            <Route path="/dashboard" element={<Dashboard />}>
            <Route path="accept-requests" element={<AcceptRequests />} />
            <Route path="profile" element={<Profile />} />
            <Route path="students" element={<StudentsList/>} />

          </Route>

          </Routes>
          <Footer  />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
