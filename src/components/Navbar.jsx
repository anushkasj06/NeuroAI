import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Nav structure ─────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: '🧠 Learn',
    links: [
      { to: '/ai-dashboard',       label: '🧠 AI Dashboard',       desc: 'Your personalized learning hub' },
      { to: '/learn',              label: '📚 Learning Session',    desc: 'AI-generated content by style' },
      { to: '/study-plan',         label: '📅 Study Plan',          desc: 'Daily, weekly & monthly plan' },
      { to: '/study-plan/generate',label: '✨ Generate Plan',        desc: 'Create a new AI study plan' },
      { to: '/progress',           label: '📈 Progress Tracker',    desc: 'Topic mastery & completion' },
    ],
  },
  {
    label: '🎮 Compete',
    links: [
      { to: '/battle',             label: '⚔️ Battle Arena',        desc: 'Multiplayer quiz battles' },
      { to: '/leaderboard',        label: '🏆 Leaderboard',         desc: 'Top performers ranking' },
      { to: '/community',          label: '👥 Community',           desc: 'Connect with peers' },
    ],
  },
  {
    label: '🔬 Tools',
    links: [
      { to: '/diagnostic',         label: '🔬 Diagnostic',          desc: 'Multi-modal learning assessment' },
      { to: '/prediction',         label: '🎯 Score Prediction',    desc: 'ML-powered grade forecast' },
      { to: '/ai-study-plan',      label: '⚡ Quick Study Plan',    desc: 'Fast Groq-powered planner' },
    ],
  },
];

// ── Active link style helper ──────────────────────────────────────────────────
const linkClass = ({ isActive }) =>
  `relative text-sm font-medium transition-colors duration-200 ${
    isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openGroup, setOpenGroup] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try { await logout(); navigate('/login'); } catch {}
  };

  return (
    <nav
      ref={navRef}
      className="bg-white/90 backdrop-blur-lg shadow-sm sticky top-0 z-50 border-b border-gray-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpenGroup(null)}>
            <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              NeuroLearn AI
            </span>
          </Link>

          {/* Desktop nav */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {/* Dashboard direct link */}
              <NavLink
                to="/ai-dashboard"
                className={linkClass}
                onClick={() => setOpenGroup(null)}
              >
                <span className="px-3 py-2 rounded-lg hover:bg-indigo-50 block">Dashboard</span>
              </NavLink>

              {/* Grouped dropdowns */}
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="relative">
                  <button
                    onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      openGroup === group.label
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
                    }`}
                  >
                    {group.label}
                    <svg className={`w-3.5 h-3.5 transition-transform ${openGroup === group.label ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {openGroup === group.label && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                      {group.links.map((link) => (
                        <NavLink
                          key={link.to}
                          to={link.to}
                          onClick={() => setOpenGroup(null)}
                          className={({ isActive }) =>
                            `flex flex-col px-4 py-2.5 hover:bg-indigo-50 transition-colors ${isActive ? 'bg-indigo-50' : ''}`
                          }
                        >
                          <span className="text-sm font-medium text-gray-800">{link.label}</span>
                          <span className="text-xs text-gray-400 mt-0.5">{link.desc}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Profile */}
              <NavLink to="/profile" className={linkClass} onClick={() => setOpenGroup(null)}>
                <span className="px-3 py-2 rounded-lg hover:bg-gray-50 block">Profile</span>
              </NavLink>
            </div>
          )}

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-600 font-medium max-w-[120px] truncate">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-600 font-medium hover:text-indigo-600 px-3 py-2">Login</Link>
                <Link to="/signup" className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1 max-h-[80vh] overflow-y-auto">
          {user ? (
            <>
              <MobileLink to="/ai-dashboard" onClick={() => setMobileOpen(false)}>🧠 Dashboard</MobileLink>
              <div className="pt-2 pb-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Learn</p>
                <MobileLink to="/learn"               onClick={() => setMobileOpen(false)}>📚 Learning Session</MobileLink>
                <MobileLink to="/study-plan"          onClick={() => setMobileOpen(false)}>📅 Study Plan</MobileLink>
                <MobileLink to="/study-plan/generate" onClick={() => setMobileOpen(false)}>✨ Generate Plan</MobileLink>
                <MobileLink to="/progress"            onClick={() => setMobileOpen(false)}>📈 Progress</MobileLink>
              </div>
              <div className="pt-2 pb-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Compete</p>
                <MobileLink to="/battle"      onClick={() => setMobileOpen(false)}>⚔️ Battle Arena</MobileLink>
                <MobileLink to="/leaderboard" onClick={() => setMobileOpen(false)}>🏆 Leaderboard</MobileLink>
                <MobileLink to="/community"   onClick={() => setMobileOpen(false)}>👥 Community</MobileLink>
              </div>
              <div className="pt-2 pb-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Tools</p>
                <MobileLink to="/diagnostic"    onClick={() => setMobileOpen(false)}>🔬 Diagnostic</MobileLink>
                <MobileLink to="/prediction"    onClick={() => setMobileOpen(false)}>🎯 Prediction</MobileLink>
                <MobileLink to="/ai-study-plan" onClick={() => setMobileOpen(false)}>⚡ Quick Study Plan</MobileLink>
                <MobileLink to="/profile"       onClick={() => setMobileOpen(false)}>👤 Profile</MobileLink>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-500 px-3 mb-2">{user.name}</p>
                <button
                  onClick={() => { setMobileOpen(false); handleLogout(); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <MobileLink to="/login"  onClick={() => setMobileOpen(false)}>Login</MobileLink>
              <MobileLink to="/signup" onClick={() => setMobileOpen(false)}>Sign Up</MobileLink>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

function MobileLink({ to, onClick, children }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
