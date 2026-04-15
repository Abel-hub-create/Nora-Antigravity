import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Megaphone, LogOut, Menu, X, Shield, CreditCard, School, Ticket, Terminal, MessageSquare, Sliders, Zap } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

const NAV = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { to: '/admin/plans', icon: CreditCard, label: 'Plans' },
  { to: '/admin/xp-config', icon: Zap, label: 'Config XP' },
  { to: '/admin/school-requests', icon: School, label: 'Écoles' },
  { to: '/admin/promo-codes', icon: Ticket, label: 'Codes promo' },
  { to: '/admin/announcements', icon: Megaphone, label: 'Annonces' },
  { to: '/admin/conversations', icon: MessageSquare, label: 'Conversations' },
  { to: '/admin/system-prompts', icon: Sliders, label: 'System Prompts' },
  { to: '/admin/debug', icon: Terminal, label: 'Debug IA' },
];

export default function AdminLayout({ children }) {
  const { adminUser, adminLogout } = useAdminAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await adminLogout();
    navigate('/admin/login');
  };

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <Shield size={20} className="text-sky-400" />
        <span className="font-bold text-white text-sm">Nora Admin</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-sky-500/20 text-sky-400 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 mb-3 truncate">{adminUser?.email}</div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  );

  return (
    <div className="admin-root min-h-screen bg-gray-950 text-white flex">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-56 shrink-0 fixed inset-y-0 left-0 z-30">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-56">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg bg-gray-800 text-gray-400">
            <Menu size={20} />
          </button>
          <Shield size={16} className="text-sky-400" />
          <span className="font-bold text-sm">Nora Admin</span>
        </div>
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
