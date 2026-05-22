import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { quiz } from '../services/api';

const linkClass = ({ isActive }) =>
  `relative text-sm font-medium transition-colors duration-200 ${
    isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hasQuizAnswers, setHasQuizAnswers] = useState(false);
  const isTeacher = user?.role === 'teacher';
  const isStudent = user && !isTeacher;

  useEffect(() => {
    const fetchQuizAnswers = async () => {
      if (!isStudent) {
        setHasQuizAnswers(false);
        return;
      }

      try {
        const response = await quiz.getAnswers();
        setHasQuizAnswers(Boolean(response?.data));
      } catch (error) {
        setHasQuizAnswers(false);
      }
    };

    fetchQuizAnswers();
  }, [isStudent]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <nav className="bg-white/95 backdrop-blur-lg shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
            NeuroLearn AI
          </Link>

          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {isStudent && (
                  <>
                    <NavLink to="/ai-dashboard" className={linkClass}>Dashboard</NavLink>
                    <NavLink to="/diagnostic" className={linkClass}>Diagnostic</NavLink>
                    <NavLink to="/ai-study-plan" className={linkClass}>AI Study Plan</NavLink>
                    {hasQuizAnswers && <NavLink to="/studyplan" className={linkClass}>Study Plan</NavLink>}
                    <NavLink to="/battle" className={linkClass}>Battle</NavLink>
                    <NavLink to="/leaderboard" className={linkClass}>Leaderboard</NavLink>
                    <NavLink to="/community" className={linkClass}>Community</NavLink>
                  </>
                )}
                {isTeacher && <NavLink to="/teacher" className={linkClass}>Teacher Dashboard</NavLink>}
                <NavLink to="/profile" className={linkClass}>Profile</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass}>Login</NavLink>
                <NavLink to="/signup" className={linkClass}>Signup</NavLink>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden sm:inline-flex text-sm text-gray-600 truncate max-w-[140px]">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                Get Started
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
