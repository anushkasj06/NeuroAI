import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  BeakerIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
  PresentationChartLineIcon,
  PuzzlePieceIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Navbar.css';

const getHomePath = (user) => {
  if (!user) return '/';
  return user.role === 'teacher' ? '/teacher' : '/ai-dashboard';
};

const studentLinksBase = [
  { to: '/ai-dashboard', label: 'Dashboard', icon: Squares2X2Icon },
  // { to: '/learn', label: 'Learn', icon: AcademicCapIcon },
  { to: '/progress', label: 'Progress', icon: PresentationChartLineIcon },
  { to: '/materials', label: 'Materials', icon: ClipboardDocumentListIcon },
  { to: '/battle', label: 'Battle Arena', icon: SparklesIcon },
  { to: '/community', label: 'Community', icon: ChatBubbleLeftRightIcon },
  { to: '/diagnostic', label: 'Diagnostic', icon: BeakerIcon },
  // { to: '/prediction', label: 'Predictions', icon: ChartBarSquareIcon },
  { to: '/profile', label: 'Profile', icon: UserCircleIcon },
];

const teacherLinks = [
  { to: '/teacher', label: 'Classroom', icon: HomeIcon },
  { to: '/teacher/content', label: 'Content Studio', icon: PuzzlePieceIcon },
  { to: '/profile', label: 'Profile', icon: UserCircleIcon },
];

const SidebarLinks = ({ links, onNavigate, collapsed = false }) => (
  <div className="space-y-1">
    {links.map((link) => {
      const Icon = link.icon;
      return (
        <NavLink
          key={link.to}
          to={link.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `side-link ${collapsed ? 'side-link--compact' : ''} ${isActive ? 'side-link--active' : 'side-link--idle'}`
          }
          title={link.label}
        >
          <span className="side-link__icon">
            <Icon className="h-4 w-4" />
          </span>
          <span className="side-link__label">{link.label}</span>
        </NavLink>
      );
    })}
  </div>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [hasDiagnosticProfile, setHasDiagnosticProfile] = useState(false);

  const isTeacher = user?.role === 'teacher';
  const isStudent = Boolean(user) && !isTeacher;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) {
      document.documentElement.style.removeProperty('--app-sidebar-width');
      return;
    }

    const width = sidebarCollapsed ? '74px' : '240px';
    document.documentElement.style.setProperty('--app-sidebar-width', width);

    try {
      localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
    } catch {}
  }, [sidebarCollapsed, user]);

  useEffect(() => {
    const checkDiagnosticStatus = async () => {
      try {
        if (!isStudent) {
          setHasDiagnosticProfile(false);
          return;
        }

        const response = await api.get('/diagnostic/status');
        setHasDiagnosticProfile(Boolean(response?.data?.data?.profile));
      } catch {
        setHasDiagnosticProfile(false);
      }
    };

    checkDiagnosticStatus();
  }, [isStudent, user?._id]);

  const links = useMemo(() => {
    if (isTeacher) return teacherLinks;
    if (isStudent) {
      const studyPlanLink = hasDiagnosticProfile
        ? { to: '/study-plan', label: 'Study Plan', icon: ClipboardDocumentListIcon }
        : { to: '/study-plan/generate', label: 'Plan Builder', icon: SparklesIcon };
      return [...studentLinksBase, studyPlanLink];
    }
    return [];
  }, [isTeacher, isStudent, hasDiagnosticProfile]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) {
    return (
      <header className="guest-topbar">
        <div className="guest-topbar__inner">
          <Link to="/" className="brand">
            <span className="brand__name">NeuroLearn</span>
            <span className="brand__chip">AI</span>
          </Link>
          <div className="guest-topbar__actions">
            <Link to="/login" className="guest-btn guest-btn--subtle">
              Login
            </Link>
            <Link to="/signup" className="guest-btn guest-btn--primary">
              Sign Up
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <aside className={`app-sidebar hidden lg:flex ${sidebarCollapsed ? 'app-sidebar--collapsed' : ''}`}>
        <div className="app-sidebar__header">
          <Link to={getHomePath(user)} className="brand brand--sidebar" title="NeuroLearn">
            <span className="brand__orb" />
            <span className="brand__name">NeuroLearn</span>
            <span className="brand__chip">AI</span>
          </Link>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronDoubleRightIcon className="h-4 w-4" />
            ) : (
              <ChevronDoubleLeftIcon className="h-4 w-4" />
            )}
          </button>
          <span className="role-chip">{isTeacher ? 'Teacher Workspace' : 'Student Workspace'}</span>
        </div>

        <div className="app-sidebar__body">
          <SidebarLinks links={links} collapsed={sidebarCollapsed} />
        </div>

        <div className="app-sidebar__footer">
          <div className="user-identity">
            <span className="user-avatar" title={user.name}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
            <p className="user-label" title={user.name}>
              {user.name}
            </p>
          </div>
          <button type="button" onClick={handleLogout} className="logout-btn">
            <ArrowLeftOnRectangleIcon className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="mobile-shell lg:hidden">
        <header className="mobile-topbar">
          <Link to={getHomePath(user)} className="brand">
            <span className="brand__name">NeuroLearn</span>
            <span className="brand__chip">AI</span>
          </Link>
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
          </button>
        </header>

        {mobileOpen && (
          <div className="mobile-drawer">
            <div className="mobile-drawer__role">
              <span>{isTeacher ? 'Teacher Workspace' : 'Student Workspace'}</span>
              <p title={user.name}>{user.name}</p>
            </div>
            <SidebarLinks links={links} onNavigate={() => setMobileOpen(false)} />
            <button
              type="button"
              className="logout-btn mt-4 w-full"
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Navbar;
