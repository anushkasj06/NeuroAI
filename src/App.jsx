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
import Dashboard from './pages/Dashboard';         // redirects → /ai-dashboard
import AIDashboard from './pages/AIDashboard';     // single unified dashboard
import Prediction from './pages/Prediction';
import StudyPlan from './pages/StudyPlan';          // legacy /studyplan route
import StudyPlanPage from './pages/StudyPlanPage';  // new /study-plan route
import StudyPlanGenerator from './pages/StudyPlanGenerator';
import LearnPage from './pages/LearnPage';
import ProgressPage from './pages/ProgressPage';
import AiStudyPlanGenerator from './pages/AiStudyPlanGenerator.jsx';
import Leaderboard from './pages/Leaderboard';
import Community from './pages/Community';
import BattleArena from './pages/BattleArena';
import Test from './pages/Test';
import Chatbot from './components/Chatbot';

const P = ({ children }) => <PrivateRoute>{children}</PrivateRoute>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-tr from-blue-50 via-white to-indigo-50">
          <Navbar />
          <Routes>
            {/* Public */}
            <Route path="/"        element={<Home />} />
            <Route path="/login"   element={<Login />} />
            <Route path="/signup"  element={<Signup />} />

            {/* Dashboard — /dashboard redirects to /ai-dashboard */}
            <Route path="/dashboard"    element={<P><Dashboard /></P>} />
            <Route path="/ai-dashboard" element={<P><AIDashboard /></P>} />

            {/* Core learning */}
            <Route path="/diagnostic"         element={<P><Diagnostic /></P>} />
            <Route path="/quiz"               element={<P><Diagnostic /></P>} />
            <Route path="/learn"              element={<P><LearnPage /></P>} />
            <Route path="/progress"           element={<P><ProgressPage /></P>} />

            {/* Study plans */}
            <Route path="/study-plan/generate" element={<P><StudyPlanGenerator /></P>} />
            <Route path="/study-plan"          element={<P><StudyPlanPage /></P>} />
            <Route path="/studyplan"           element={<P><StudyPlan /></P>} />
            <Route path="/ai-study-plan"       element={<P><AiStudyPlanGenerator /></P>} />

            {/* Tools */}
            <Route path="/prediction" element={<P><Prediction /></P>} />
            <Route path="/profile"    element={<P><Profile /></P>} />
            <Route path="/test"       element={<P><Test /></P>} />

            {/* Social */}
            <Route path="/battle"      element={<P><BattleArena /></P>} />
            <Route path="/leaderboard" element={<P><Leaderboard /></P>} />
            <Route path="/community"   element={<P><Community /></P>} />
          </Routes>
          <Chatbot />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
