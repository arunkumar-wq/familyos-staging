import React, { useState, useEffect, Component } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
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

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e, i) { console.error('Page error:', e, i); }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ color: 'var(--txt)', marginBottom: 12 }}>Something went wrong</h2>
        <p style={{ color: 'var(--txt3)', fontSize: 14, marginBottom: 20 }}>An error occurred while rendering this page.</p>
        <button className="btn btn-teal" onClick={() => this.setState({ hasError: false })}>Try Again</button>
      </div>
    );
    return this.props.children;
  }
}

function AppShell() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [editMemberData, setEditMemberData] = useState(null);

  // Scroll to top on every page change (and initial mount after login).
  // Must be before conditional returns to satisfy React's rules of hooks.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [page]);

  if (loading) return (
    <div className="loading-screen" style={{ height: '100vh' }}>
      <div className="spinner" />
      <p style={{ color: 'var(--txt3)', fontSize: 13 }}>Loading LINIO...</p>
    </div>
  );

  if (!user) return <LoginPage />;

  const navigate = (pg, extra) => {
    if (pg === 'edit-member' && extra) setEditMemberData(extra);
    else if (pg !== 'edit-member') setEditMemberData(null);
    setPage(pg);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':     return <DashboardPage navigate={navigate} />;
      case 'documents':     return <DocumentsPage navigate={navigate} />;
      case 'portfolio':     return <PortfolioPage />;
      case 'family':        return <FamilyPage navigate={navigate} />;
      case 'insights':      return <InsightsPage navigate={navigate} />;
      case 'audit':         return <AuditPage navigate={navigate} />;
      case 'calendar':      return <CalendarPage />;
      case 'notifications': return <NotificationsPage />;
      case 'settings':      return <SettingsPage navigate={navigate} />;
      case 'profile':       return <EditProfilePage navigate={navigate} />;
      case 'add-member':    return <AddMemberPage navigate={navigate} editMember={null} />;
      case 'edit-member':   return <AddMemberPage navigate={navigate} editMember={editMemberData} />;
      default:              return <DashboardPage navigate={navigate} />;
    }
  };

  return (
    <div className="app-shell">
      <Navbar page={page} navigate={navigate} />
      <div className="main-content">
        <div className="page-scroll">
          <ErrorBoundary key={page}>{renderPage()}</ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>;
}
