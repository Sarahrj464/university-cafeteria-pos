import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ChefHat, Wallet, History, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';

export default function StudentPortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const activeClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
      isActive
        ? 'bg-orange-600 text-white shadow-md'
        : 'text-forest/70 hover:bg-forest/5 hover:text-forest'
    }`;

  return (
    <div className="h-screen bg-cream flex flex-col font-sans overflow-hidden">
      {/* Header Banner */}
      <header className="flex-none bg-forest px-6 py-4 text-cream shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ChefHat size={30} className="text-orange-500" />
          <div>
            <h1 className="text-xl font-black tracking-wide">STUDENT HUB</h1>
            <p className="text-xs text-cream/70">Campus Dining & Meal Plan</p>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="font-bold text-sm">{user?.name}</p>
            <p className="text-xs text-cream/60">{user?.studentId || 'Student'}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-forest-light hover:text-white border border-cream/20"
            onClick={logout}
          >
            <LogOut size={16} className="text-white" />
            <span className="text-white">Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 min-h-0 overflow-hidden max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 p-6">
        {/* Navigation Sidebar */}
        <aside className="md:w-64 shrink-0 bg-white p-4 rounded-2xl border border-forest/10 shadow-sm flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
          <NavLink to="/student/menu" className={activeClass}>
            <Menu size={18} />
            Browse Menu
          </NavLink>
          <NavLink to="/student/wallet" className={activeClass}>
            <Wallet size={18} />
            My Meal Plan
          </NavLink>
          <NavLink to="/student/history" className={activeClass}>
            <History size={18} />
            Order History
          </NavLink>
        </aside>

        {/* Content Outlet */}
        <main className="flex-1 min-h-0 bg-white rounded-2xl border border-forest/10 p-6 shadow-sm overflow-hidden flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
