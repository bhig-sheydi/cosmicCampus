import React from 'react';
import { Routes, Route, BrowserRouter as Router, useLocation } from 'react-router-dom';
import { ThemeProvider } from './components/Contexts/ThemeProvider';
import { AuthProvider } from './components/Contexts/AuthContext';
import Home from './Pages/Home';
import Footer from './components/CustomComponents/Footer';
import NavContainer from './components/CustomComponents/NavContainer';
import { SignUp } from './Pages/SignupForm';
import { Toaster } from "@/components/ui/toaster";
import { Login } from './Pages/LogIn';
import { Dashboard } from './components/CustomComponents/Dashboard';
import AcceptRequests from './Pages/AcceptRequest';
import Profile from './Pages/Profile';
import StudentsList from './Pages/StudentList';
import TeacherList from './Pages/TeacherList';
import Aray from './Pages/Notifications';
import TeacherAssign from './Pages/TeacherAsign';
import TeacherAttendance from './Pages/TeacherAttendance';
import FixedQRCode from './Pages/FixedQrCode';
import GuardianProfile from './Pages/GuardianProfile';
import ResetPasswordPage from './Pages/Reset';
import { UpdatePassword } from './Pages/updatepassword';
import CBTExam from './Pages/CBTEXAMS';
import TeacherSubjectsCard from './Pages/TeachersAssingnmentDashboard';
import StudentAssingnments from './Pages/StudentAssingnments';
import AssignmentPage from './Pages/AssignmentPage';
import AssignmentHistory from './Pages/AssignmentHistory';
import GeneralAssignments from './Pages/GeneralAsignments';
import GuardianAssignment from './Pages/GuardianAssignment';
import Monitor from './Pages/Monitor';
import GuidedLessonEditor from './Pages/LesonNote';
import SaveNoteModal from './Pages/SaveModal';
import RecordAssignments from './Pages/RecordAssignments';
import TeachersTests from './Pages/TestHistory';
import TeachersExams from './Pages/ExamHistory';
import SchoolsInventory from './Pages/SchoolsInventory';
import SchoolDashboard from './Pages/SchoolDashboard';
import AddInventoryPage from './Pages/AddInventory';
import RestockPage from './Pages/Restock';
import PlaceOrder from './Pages/PlaceOrder';
import CartPage from './Pages/CartPage';
import ReceiptPage from './Pages/ReceiptPage';
import SchoolAccountSetup from './Pages/AddAccounts';
import SchoolFees from './Pages/SchoolFees';
import GuardianFees from './Pages/GuardianFees';
import CreateDependentChild from './components/CustomComponents/CreateDependentChild';
import UpgradeManagedStudent from './components/CustomComponents/UpgradeManagedStudent';
import GuardianClassRanking from './components/CustomComponents/ClassLeaderBoard';
import DuplicateClassToArm from './components/CustomComponents/DuplicateClassToArm';
import ResetStudentPassword from './Pages/ResetStudentPassword';
import ResetChildPasswordFromParentPortal from './Pages/ResetChildPasswordFromParentPortal';
import StudentAcessment from './Pages/StudentAcessment';
import BatchDashboard from './Pages/BatchDashboard';
import StudentTests from './Pages/StudentTest';
import StudentExams from './Pages/studentExams';
import TestLobby from './Pages/TestLobby';
import TeacherMonitoringDashboard from './Pages/TeacherMonitoringDashboard';

// Wrapper component to conditionally show footer
function AppContent() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <NavContainer />
      
      <div className="flex-1">
        <Routes>
          {/* ==================== PUBLIC ROUTES ==================== */}
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset" element={<ResetPasswordPage />} />
          <Route path="/update" element={<UpdatePassword />} />
          
          {/* ==================== DASHBOARD ROUTES ==================== */}
          <Route path="/dashboard" element={<Dashboard />}>
            
            {/* ─── General / Shared ─── */}
            <Route path="profile" element={<Profile />} />
            <Route path="notifications" element={<Aray />} />
            
            {/* ─── School Administration ─── */}
            <Route path="school-dashboard" element={<SchoolDashboard />} />
            <Route path="accept-requests" element={<AcceptRequests />} />
            <Route path="students" element={<StudentsList />} />
            <Route path="teachers" element={<TeacherList />} />
            <Route path="classsubject" element={<TeacherAssign />} />
            <Route path="attendanceQR" element={<FixedQRCode />} />
            <Route path="bank-account-setup" element={<SchoolAccountSetup />} />
            <Route path="fee-payments-structure" element={<SchoolFees />} />
            <Route path="GeneralAssignments" element={<GeneralAssignments />} />
            <Route path="createBatch" element={<BatchDashboard />} />
            <Route path="createArm" element={<DuplicateClassToArm />} />
            
            {/* ─── Teacher Features ─── */}
            <Route path="attendance" element={<TeacherAttendance />} />
            <Route path="assessment" element={<TeacherSubjectsCard />} />
            <Route path="note-editor" element={<GuidedLessonEditor />} />
            <Route path="teachhersAsignment" element={<AssignmentHistory />} />
            <Route path="teachersExams" element={<TeachersExams />} />
            <Route path="teachersTests" element={<TeachersTests />} />
            <Route path="asignmentRecord" element={<RecordAssignments />} />
            <Route path="monitoring" element={<TeacherMonitoringDashboard/>} />
            
            
            {/* ─── Parent/Guardian Features ─── */}
            <Route path="dependent" element={<CreateDependentChild />} />
            <Route path="leaders" element={<GuardianClassRanking />} />
            <Route path="fee-payments" element={<GuardianFees />} />
            <Route path="place-order" element={<PlaceOrder />} />
            <Route path="childshomework" element={<GuardianAssignment />} />
            <Route path="resetStudentPassword" element={<ResetStudentPassword />} />
            <Route path="rsppd" element={<ResetChildPasswordFromParentPortal />} />
            <Route path="upgradestudent" element={<UpgradeManagedStudent />} />
            <Route path="monitorHomework" element={<Monitor />} />
            
            {/* ─── Student Features ─── */}
            <Route path="studentAssignment" element={<StudentAssingnments />} />
            <Route path="homework" element={<AssignmentPage />} />
            <Route path="c_assessment" element={<StudentAcessment />} />
            <Route path="view-tests" element={<StudentTests/>} />
            <Route path="view-exams" element={<StudentExams/>} />
              <Route path="take-test" element={<TestLobby/>} />

            
            
            
            {/* ─── Inventory / Store ─── */}
            <Route path="inventory" element={<SchoolsInventory />} />
            <Route path="add-product" element={<AddInventoryPage />} />
            <Route path="restock" element={<RestockPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="receipt" element={<ReceiptPage />} />
            
            {/* ─── Utilities / Hidden ─── */}
            <Route path="a" element={<GuardianProfile />} />
            <Route path="exams" element={<CBTExam />} />
            
          </Route>
        </Routes>
      </div>
      
      {/* Only show footer on non-dashboard pages */}
      {!isDashboard && <Footer />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <Toaster />
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;