import React from 'react';
import { Routes, Route, BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './components/Contexts/ThemeProvider';
import { AuthProvider } from './components/Contexts/AuthContext'; // Import the AuthProvider
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
import { ResetPassword } from './Pages/Reset';
import { UpdatePassword } from './Pages/updatepassword';
import CBTExam from './Pages/CBTEXAMS'
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
import TeamWhosoeverSVG from './Pages/svg';








function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">

      <AuthProvider>
        <Toaster />
        <Router>
          <NavContainer />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
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
              <Route path="Assignments" element={<TeacherSubjectsCard />} />
              <Route path="notifications" element={<Aray />} />
              <Route path="studentAssignment" element={<StudentAssingnments />} />
              <Route path="homework" element={<AssignmentPage />} />
              <Route path="teachersExams" element={<TeachersExams />} />
              <Route path="teachhersAsignment" element={<AssignmentHistory />} />
              <Route path="teachersTests" element={<TeachersTests />} />
              <Route path="GeneralAssignments" element={<GeneralAssignments />} />
              <Route path="childshomework" element={<GuardianAssignment />} />
              <Route path="monitorHomework" element={<Monitor />} />
              <Route path="note-editor" element={<GuidedLessonEditor />} />
              <Route path="asignmentRecord" element={<RecordAssignments />} />
              <Route path="notesave" element={<SaveNoteModal />} />
              <Route path="school-inventory" element={<SchoolsInventory />} />
              <Route path="school-dashboard" element={<SchoolDashboard />} />
              <Route path="add-product" element={<AddInventoryPage />} />
               <Route path="restock" element={<RestockPage/>} />
               <Route path="place-order" element={<PlaceOrder/>} />
                <Route path="cart" element={<CartPage/>}/>
                <Route path="b427824287ww93u28y773e273g7gd73137g643824g7"element={<ReceiptPage/>}/>
                <Route path="account-setup" element={<SchoolAccountSetup/>}/>
                 <Route path="fee-payments-structure" element={<SchoolFees/>}/>
                 <Route path="fee-payments" element={<GuardianFees/>}/>
                


                

              
            </Route>

          </Routes>
          <Footer />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
