import React, { useState } from 'react';
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

const PAGE_TITLES = {dashboard:'Dashboard',documents:'Document Vault',portfolio:'Portfolio',family:'Family'insights:'AI Insights',audit:'Vault Audit',calendar:'Calendar',notifications: 'Notifications',settings:'Settings',profile:'Edit Profile','add-member':'Add Member','edit-member':'Edit Member'};

function AppShell() {
  const {user,loading}=useAuth();
  const [page,setPage]=useState('dashboard');
  const [mobileSidebar,setMobileSidebar]=useState(false);
  const [editMemberData,setEditMemberData]=useState(null);
  if(loading)return(<div className="loading-screen" style={{height:'100vh'}}><div className="spinner"/></div>);
  if(!user)return <LoginPage/>;
  const navigate=(pg,extra)=>{in(pg==='edit-member'&&extra)setEditMemberData(extra);setPage(pg);setMobileSidebar(false);};
  const renderPage=()=>{switch(page){case'dashboard':return<DashboardPage navigate={navigate}/>;case'documents':return<DocumentsPage navigate={navigate}/>;case'portfolio':return<PortfolioPage/>;case'family':return<FamilyPage navigate={navigate}/>;case'insights':return<InsightsPage/>;case'audit':return<AuditPage/>;case'calendar':return<CalendarPage/>;case'notifications':return<NotificationsPage/>;case'settings':return<SettingsPage navigate={navigate}/>;case'profile':return<EditProfilePage navigate={navigate}/>;case'add-member':return<AddMemberPage navigate={navigate} editMember={null}/>;case'edit-member':return<AddMemberPage navigate={navigate} editMember={editMemberData}/>;default:return<DashboardPage navigate={navigate}/>}};
  return(<div className="app-shell">{mobileSidebar&&<div className="mobile-overlay" onClick={()=>setMobileSidebar(false)}/>}<Sidebar page={page} navigate={navigate} mobile={mobileSidebar} onClose={()=>setMobileSidebar(false)}/><div className="main-content"><Topbar title={PAGE_TITLES[page]||'FamilyOS'} onMenuClick={()=>setMobileSidebar(true)} navigate={navigate}/><div className="page-scroll">{renderPage()}</div></div></div>);}
export default function App(){return <AuthProvider><AppShell/></AuthProvider>;}
