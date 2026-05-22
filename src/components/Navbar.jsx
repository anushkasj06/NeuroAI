import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { quiz } from '../services/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hasQuizAnswers, setHasQuizAnswers] = useState(false);

  useEffect(() => {
    const checkQuizAnswers = async () => {
      try {
        if (user) {
          const response = await quiz.getAnswers();
          setHasQuizAnswers(Boolean(response.data));
        } else {
          setHasQuizAnswers(false);
        }
      } catch (error) {
        setHasQuizAnswers(false);
      }
    };

    checkQuizAnswers();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-white/80 via-blue-50/50 to-indigo-50/50 backdrop-blur-lg shadow-lg sticky top-0 z-50 border-b border-white/20">
      <div className="relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-[100%] opacity-50">
            <div className="absolute top-0 -left-48 w-96 h-96 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 -right-48 w-96 h-96 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link 
                  to="/" 
                  className="relative group"
                >
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-transparent bg-clip-text group-hover:opacity-80 transition-all duration-300">
                    LearnAhead AI
                  </span>
                  <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </div>
              {user && (
                <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                  <Link
                    to="/dashboard"
                    className="relative group border-transparent text-gray-600 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    <span className="relative z-10 group-hover:text-blue-600 transition-colors duration-300">Dashboard</span>
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </Link>
                  <Link
                    to="/profile"
                    className="relative group border-transparent text-gray-600 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    <span className="relative z-10 group-hover:text-blue-600 transition-colors duration-300">Profile</span>
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </Link>
                  <Link
                    to="/quiz"
                    className="relative group border-transparent text-gray-600 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    <span className="relative z-10 group-hover:text-blue-600 transition-colors duration-300">Quiz</span>
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </Link>
                  <Link
                    to="/leaderboard"
                    className="relative group border-transparent text-gray-600 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    <span className="relative z-10 group-hover:text-blue-600 transition-colors duration-300">Leaderboard</span>
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </Link>
                  <Link
                    to="/battle"
                    className="relative group border-transparent text-gray-600 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    <span className="relative z-10 group-hover:text-blue-600 transition-colors duration-300">Battle Arena</span>
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </Link>
                  <Link
                    to="/community"
                    className="relative group border-transparent text-gray-600 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    <span className="relative z-10 group-hover:text-blue-600 transition-colors duration-300">Community</span>
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </Link>
                  
                  <Link
                    to="/ai-study-plan"
                    className="relative group border-transparent text-gray-600 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    <span className="relative z-10 group-hover:text-blue-600 transition-colors duration-300">AI Study Plan</span>
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </Link>
                  {hasQuizAnswers && (
                    <Link
                      to="/studyplan"
                      className="relative group border-transparent text-gray-600 inline-flex items-center px-1 pt-1 text-sm font-medium"
                    >
                      <span className="relative z-10 group-hover:text-blue-600 transition-colors duration-300">Study Plan</span>
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              {user ? (
                <div className="flex items-center space-x-6">
                  <div className="relative group">
                    <span className="text-gray-700 font-medium group-hover:text-blue-600 transition-colors duration-300">{user.name}</span>
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="relative group overflow-hidden bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-xl"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-pink-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    <span className="relative">Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-6">
                  <Link
                    to="/login"
                    className="relative group text-gray-600 px-3 py-2 text-sm font-medium"
                  >
                    <span className="relative z-10 group-hover:text-blue-600 transition-colors duration-300">Login</span>
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <Link
                    to="/signup"
                    className="relative group overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-xl"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    <span className="relative">Sign Up</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
