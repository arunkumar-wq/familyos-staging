import React, { useState, Component } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import PortfolioPage from './pages/PortfolioPage';
import FamilyPage from './pages/FamilyPage';
import InsightsPage from './pages/InsightsPage';
import AuditPage from './pages/AuditPage';
import CalendarPage from './pages/CalendarPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import EditProfilePage from './pages/EditProfilePage';
import AddMemberPage from './pages/AddMemberPage';

const PAGE_TITLES = {
  dashboard:    'Dashboard',
  documents:    'Documents',
  portfolio:    'Portfolio',
  family:       'Family',
  insights:     'AI Insights',
  audit:        'Vault Audit',
  calendar:     'Calendar',
  notifications:'Notifications',
  settings:     'Settings',
  profile:      'Edit Profile',
  'add-member': 'Add Member',
  'edit-member':'Edit Member',
};

// Error boundary to prevent full-app crashes
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Page error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2 style={{ color: 'var(--txt)', marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ color: 'var(--txt3)', fontSize: 14, marginBottom: 20 }}>
            An error occurred while rendering this page.
          </p>
          <button
            className="btn btn-teal"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [editMemberData, setEditMemberData] = useState(null);

  if (loading) {
    return (
      <div className="loading-screen" style={{ height: '100vh' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--txt3)', fontSize: 13 }}>Loading FamilyOS...</p>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const navigate = (pg, extra) => {
    if (pg === 'edit-member' && extra) {
      setEditMemberData(extra);
    } else if (pg !== 'edit-member') {
      setEditMemberData(null);
    }
    setPage(pg);
    setMobileSidebar(false);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':    return <DashboardPage navigate={navigate} />;
      case 'documents':    return <DocumentsPage navigate={navigate} />;
      case 'portfolio':    return <PortfolioPage />;
      case 'family':       return <FamilyPage navigate={navigate} />;
      case 'insights':     return <InsightsPage />;
      case 'audit':        return <AuditPage />;
      case 'calendar':     return <CalendarPage />;
      case 'notifications':return <NotificationsPage />;
      case 'settings':     return <SettingsPage navigate={navigate} />;
      case 'profile':      return <EditProfilePage navigate={navigate} />;
      case 'add-member':   return <AddMemberPage navigate={navigate} editMember={null} />;
      case 'edit-member':  return <AddMemberPage navigate={navigate} editMember={editMemberData} />;
      default:             return <DashboardPage navigate={navigate} />;
    }
  };

  return (
    <div className="app-shell">
      {mobileSidebar && (
        <div className="mobile-overlay" onClick={() => setMobileSidebar(false)} aria-hidden="true" />
      )}
      <Sidebar
        page={page}
        navigate={navigate}
        mobile={mobileSidebar}
        onClose={() => setMobileSidebar(false)}
      />
      <div className="main-content">
        <Topbar
          title={PAGE_TITLES[page] || 'FamilyOS'}
          onMenuClick={() => setMobileSidebar(true)}
          navigate={navigate}
        />
        <div className="page-scroll">
          <ErrorBoundary key={page}>
            {renderPage()}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>;
}
