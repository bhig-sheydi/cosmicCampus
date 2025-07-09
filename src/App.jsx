// src/App.js

import React from 'react';
import { Routes, Route, BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './components/Contexts/ThemeProvider';
import { AuthProvider } from './components/Contexts/AuthContext'; // Import the AuthProvider
import Home from './Pages/Home';

import WebsiteDesign from './Pages/WebsiteDesign';
import DigitalMarketing from './Pages/DigitalMarketing';
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
import TeacherList from './components/CustomComponents/TeacherList';
import Aray from './components/CustomComponents/Aray';
import TeacherAssign from './components/CustomComponents/TeacherAsign';
import TeacherAttendance from './components/CustomComponents/TeacherAttendance';
import FixedQRCode from './components/CustomComponents/FixedQrCode';
import GuardianProfile from './components/CustomComponents/GuardianProfile';
import { ResetPassword } from './components/CustomComponents/Reset';
import { UpdatePassword } from './components/CustomComponents/updatepassword';
import CBTExam from './components/CustomComponents/CBTEXAMS'
import TeacherSubjectsCard from './components/CustomComponents/TeachersAssingnmentDashboard';
import StudentAssingnments from './components/CustomComponents/StudentAssingnments';
import AssignmentPage from './components/CustomComponents/AssignmentPage';
import AssignmentHistory from './components/CustomComponents/AssignmentHistory';
import GeneralAssignments from './components/CustomComponents/GeneralAsignments';
import GuardianAssignment from './components/CustomComponents/GuardianAssignment';
import Monitor from './components/CustomComponents/Monitor';
import GuidedLessonEditor from './components/CustomComponents/LesonNote';
import SaveNoteModal from './components/CustomComponents/SaveModal';






function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">

      <AuthProvider>
        <Toaster />
        <Router>
          <NavContainer />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/website-design" element={<WebsiteDesign />} />
            <Route path="/digital-marketing" element={<DigitalMarketing />} />
            <Route path="/graphic-design" element={<GraphicDesign />} />
            <Route path="/growth-tools" element={<GrowthTools />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/otp" element={<Auth />} />
            <Route path="/db" element={<DashboardTest />} />
             <Route path="/exams" element={<CBTExam />} />
            <Route path="/reset" element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/dashboard" element={<Dashboard />}>
              <Route path="accept-requests" element={<AcceptRequests />} />
              <Route path="profile" element={<Profile />} />
              <Route path="students" element={<StudentsList />} />
              <Route path="teachers" element={<TeacherList />} />
              <Route path="classsubject" element={<TeacherAssign />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="attendanceQR" element={<FixedQRCode />} />
              <Route path="a" element={<GuardianProfile />} />
              <Route path="Assignments" element={<TeacherSubjectsCard/>} />
              <Route path="notifications" element={<Aray />} />
              <Route path="studentAssignment" element={<StudentAssingnments/>} />
              <Route path="homework" element={<AssignmentPage/>} />
              <Route path="teachhersAsignment" element={<AssignmentHistory/>} />
              <Route path="GeneralAssignments" element={<GeneralAssignments/>} />
              <Route path="childshomework" element={<GuardianAssignment/>} />
              <Route path="monitorHomework" element={<Monitor/>} />
              <Route path="note-editor" element={<GuidedLessonEditor/>} />
              <Route path="notesave" element={<SaveNoteModal/>} />


            </Route>

          </Routes>
          <Footer />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
