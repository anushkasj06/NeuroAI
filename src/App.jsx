import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Diagnostic from './pages/Diagnostic';
import Dashboard from './pages/Dashboard';
import AIDashboard from './pages/AIDashboard';
import Prediction from './pages/Prediction';
import StudyPlanPage from './pages/StudyPlanPage';
import StudyPlanGenerator from './pages/StudyPlanGenerator';
import LearnPage from './pages/LearnPage';
import ProgressPage from './pages/ProgressPage';
import Community from './pages/Community';
import BattleArena from './pages/BattleArena';
import Test from './pages/Test';
import TeacherDashboard from './pages/TeacherDashboard';
import Chatbot from './components/Chatbot';

const P = ({ children, allowedRoles = [] }) => (
  <PrivateRoute allowedRoles={allowedRoles}>{children}</PrivateRoute>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-tr from-blue-50 via-white to-indigo-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/profile" element={<P><Profile /></P>} />
            <Route path="/dashboard" element={<P allowedRoles={['student']}><Dashboard /></P>} />
            <Route path="/ai-dashboard" element={<P allowedRoles={['student']}><AIDashboard /></P>} />
            <Route path="/diagnostic" element={<P allowedRoles={['student']}><Diagnostic /></P>} />
            <Route path="/quiz" element={<P allowedRoles={['student']}><Diagnostic /></P>} />
            <Route path="/learn" element={<P allowedRoles={['student']}><LearnPage /></P>} />
            <Route path="/progress" element={<P allowedRoles={['student']}><ProgressPage /></P>} />
            <Route path="/study-plan/generate" element={<P allowedRoles={['student']}><StudyPlanGenerator /></P>} />
            <Route path="/study-plan" element={<P allowedRoles={['student']}><StudyPlanPage /></P>} />
            <Route path="/prediction" element={<P allowedRoles={['student']}><Prediction /></P>} />
            <Route path="/test" element={<P allowedRoles={['student']}><Test /></P>} />
            <Route path="/battle" element={<P allowedRoles={['student']}><BattleArena /></P>} />
            <Route path="/community" element={<P allowedRoles={['student']}><Community /></P>} />
            <Route path="/teacher" element={<P allowedRoles={['teacher']}><TeacherDashboard /></P>} />
          </Routes>
          <Chatbot />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

