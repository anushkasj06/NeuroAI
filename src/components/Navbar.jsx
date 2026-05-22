import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.role === 'teacher';
  const isStudent = user && !isTeacher;

  const [hasQuizAnswers, setHasQuizAnswers] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const checkQuizAnswers = async () => {
      try {
        if (!isStudent) {
          setHasQuizAnswers(false);
          return;
        }
        const response = await api.get('/diagnostic/status');
        setHasQuizAnswers(response?.data?.data?.profile != null);
      } catch (error) {
        console.error('Error checking diagnostic status:', error);
        setHasQuizAnswers(false);
      }
    };

    checkQuizAnswers();
  }, [user, isStudent]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error(error);
    }
  };

  const linkClass = ({ isActive }) =>
    `relative group inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors duration-300 ${
      isActive ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
    }`;

  return (
    <nav className="bg-gradient-to-r from-white/80 via-blue-50/50 to-indigo-50/50 backdrop-blur-lg shadow-lg sticky top-0 z-50 border-b border-white/20">
      <div className="relative">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-[100%] opacity-50">
            <div className="absolute top-0 -left-48 w-96 h-96 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>

            <div className="absolute top-0 -right-48 w-96 h-96 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex justify-between items-center h-16">
            
            {/* Left Section */}
            <div className="flex items-center">
              
              {/* Logo */}
              <Link to="/" className="relative group">
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-transparent bg-clip-text group-hover:opacity-80 transition-all duration-300">
                  NeuroLearn AI
                </span>

                <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
              </Link>

              {/* Desktop Navigation */}
              {user && (
                <div className="hidden md:flex ml-8 space-x-6">
                  {isStudent && (
                    <>
                      <NavLink to="/dashboard" className={linkClass}>
                        Dashboard
                      </NavLink>
                      <NavLink to="/profile" className={linkClass}>
                        Profile
                      </NavLink>
                      <NavLink to="/diagnostic" className={linkClass}>
                        Diagnostic
                      </NavLink>
                      <NavLink to="/leaderboard" className={linkClass}>
                        Leaderboard
                      </NavLink>
                      <NavLink to="/battle" className={linkClass}>
                        Battle Arena
                      </NavLink>
                      <NavLink to="/community" className={linkClass}>
                        Community
                      </NavLink>
                      <NavLink to="/ai-study-plan" className={linkClass}>
                        AI Study Plan
                      </NavLink>
                      <NavLink to="/materials" className={linkClass}>
                        Materials
                      </NavLink>
                      {hasQuizAnswers && (
                        <NavLink to="/studyplan" className={linkClass}>
                          Study Plan
                        </NavLink>
                      )}
                    </>
                  )}
                  {isTeacher && (
                    <>
                      <NavLink to="/teacher" className={linkClass}>
                        Teacher Dashboard
                      </NavLink>
                      <NavLink to="/teacher/content" className={linkClass}>
                        Content Studio
                      </NavLink>
                      <NavLink to="/profile" className={linkClass}>
                        Profile
                      </NavLink>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right Section */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-sm text-gray-600 font-medium max-w-[120px] truncate">
                    {user.name}
                  </span>

                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm text-gray-600 font-medium hover:text-indigo-600 px-3 py-2"
                  >
                    Login
                  </Link>

                  <Link
                    to="/signup"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1 max-h-[80vh] overflow-y-auto">
            
            {user ? (
              <>
                {isStudent && (
                  <>
                    <MobileLink
                      to="/dashboard"
                      onClick={() => setMobileOpen(false)}
                    >
                      🧠 Dashboard
                    </MobileLink>

                    <MobileLink
                      to="/diagnostic"
                      onClick={() => setMobileOpen(false)}
                    >
                      🔬 Diagnostic
                    </MobileLink>

                    <MobileLink
                      to="/leaderboard"
                      onClick={() => setMobileOpen(false)}
                    >
                      🏆 Leaderboard
                    </MobileLink>

                    <MobileLink
                      to="/battle"
                      onClick={() => setMobileOpen(false)}
                    >
                      ⚔️ Battle Arena
                    </MobileLink>

                    <MobileLink
                      to="/community"
                      onClick={() => setMobileOpen(false)}
                    >
                      👥 Community
                    </MobileLink>

                    <MobileLink
                      to="/ai-study-plan"
                      onClick={() => setMobileOpen(false)}
                    >
                      ⚡ AI Study Plan
                    </MobileLink>

                    <MobileLink
                      to="/materials"
                      onClick={() => setMobileOpen(false)}
                    >
                      📚 Materials
                    </MobileLink>

                    {hasQuizAnswers && (
                      <MobileLink
                        to="/studyplan"
                        onClick={() => setMobileOpen(false)}
                      >
                        📅 Study Plan
                      </MobileLink>
                    )}
                  </>
                )}

                {isTeacher && (
                  <>
                    <MobileLink
                      to="/teacher"
                      onClick={() => setMobileOpen(false)}
                    >
                      🎓 Teacher Dashboard
                    </MobileLink>

                    <MobileLink
                      to="/teacher/content"
                      onClick={() => setMobileOpen(false)}
                    >
                      🧩 Content Studio
                    </MobileLink>
                  </>
                )}

                <MobileLink
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                >
                  👤 Profile
                </MobileLink>

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500 px-3 mb-2">
                    {user.name}
                  </p>

                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <MobileLink
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </MobileLink>

                <MobileLink
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign Up
                </MobileLink>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

function MobileLink({ to, onClick, children }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          isActive
            ? 'bg-indigo-50 text-indigo-600'
            : 'text-gray-700 hover:bg-gray-50'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default Navbar;