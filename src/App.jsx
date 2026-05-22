import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Diagnostic from './pages/Diagnostic';
import Dashboard from './pages/Dashboard';
import Chatbot from './components/Chatbot';
import Prediction from './pages/Prediction';
import StudyPlan from './pages/StudyPlan';
import Test from './pages/Test';
import AiStudyPlanGenerator from './pages/AiStudyPlanGenerator.jsx';
import Leaderboard from './pages/Leaderboard';
import Community from './pages/Community';
import BattleArena from './pages/BattleArena';
import TeacherDashboard from './pages/TeacherDashboard';

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
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path="/quiz"
              element={
                <PrivateRoute allowedRoles={['student']}>
                  <Diagnostic />
                </PrivateRoute>
              }
            />
            <Route
              path="/diagnostic"
              element={
                <PrivateRoute allowedRoles={['student']}>
                  <Diagnostic />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute allowedRoles={['student']}>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/prediction"
              element={
                <PrivateRoute allowedRoles={['student']}>
                  <Prediction />
                </PrivateRoute>
              }
            />
            <Route
              path="/studyplan"
              element={
                <PrivateRoute allowedRoles={['student']}>
                  <StudyPlan />
                </PrivateRoute>
              }
            />
            <Route
              path="/test"
              element={
                <PrivateRoute allowedRoles={['student']}>
                  <Test />
                </PrivateRoute>
              }
            />
            <Route
              path="/ai-study-plan"
              element={
                <PrivateRoute allowedRoles={['student']}>
                  <AiStudyPlanGenerator />
                </PrivateRoute>
              }
            />
            <Route
              path="/community"
              element={
                <PrivateRoute allowedRoles={['student']}>
                  <Community />
                </PrivateRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <PrivateRoute allowedRoles={['student']}>
                  <Leaderboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/battle"
              element={
                <PrivateRoute allowedRoles={['student']}>
                  <BattleArena />
                </PrivateRoute>
              }
            />
            <Route
              path="/teacher"
              element={
                <PrivateRoute allowedRoles={['teacher']}>
                  <TeacherDashboard />
                </PrivateRoute>
              }
            />
          </Routes>
          <Chatbot />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
