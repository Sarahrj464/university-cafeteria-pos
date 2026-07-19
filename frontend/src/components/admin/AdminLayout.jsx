import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Utensils,
  ClipboardList,
  Layers,
  BarChart3,
  Users,
  CreditCard,
  Settings,
  LogOut,
  ChefHat,
  QrCode
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import { APP_NAME } from '../../config/appConfig';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/menu', label: 'Menu Management', icon: Utensils },
    { to: '/admin/inventory', label: 'Inventory', icon: Layers },
    { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
    { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
    { to: '/admin/staff', label: 'Staff Management', icon: Users },
    { to: '/admin/meal-plans', label: 'Meal Plans', icon: CreditCard },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
    { to: '/admin/barcode-management', label: 'Barcodes', icon: QrCode },
  ];

  const activeClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
      isActive
        ? 'flex items-center gap-3 px-4 py-3 rounded-xl font-bold \
 text-sm bg-[#E76F00] text-white shadow-lg \
 shadow-orange-900/30 transition-all duration-200'
        : 'flex items-center gap-3 px-4 py-3 rounded-xl font-bold \
 text-sm text-cream/70 \
 hover:bg-white/10 hover:text-white hover:pl-5 \
 transition-all duration-200'
    }`;


  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-forest text-cream shrink-0 shadow-xl border-r border-forest-light md:fixed md:inset-y-0 md:left-0 md:h-screen">
        <div className="flex h-full flex-col">
          {/* Logo / Brand Header */}
          <div className="p-6 border-b border-forest-light flex items-center gap-3">
            <ChefHat size={32} className="text-orange-500 animate-pulse" />
            <div>
              <h1 className="text-lg font-black tracking-wider text-white">{APP_NAME.toUpperCase()} ADMIN</h1>
              <p className="text-[10px] text-cream/60 uppercase font-bold tracking-widest">Control Panel</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} className={activeClass}>
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Footer Admin User profile */}
          <div className="p-4 border-t border-forest-light space-y-4 bg-forest-dark/40">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-orange-600/20 rounded-full border border-orange-600/30 flex items-center justify-center font-black text-orange-500">
                {user?.name?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-sm text-white truncate max-w-[140px]">{user?.name}</p>
                <span className="inline-block text-[9px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-black tracking-widest uppercase">
                  {user?.role}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-white hover:bg-white/10 hover:text-white border border-cream/10 rounded-xl"
              onClick={logout}
            >
              <LogOut size={16} className="text-white" />
              <span className="text-white">Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col min-h-screen md:ml-64">
        <div className="flex-1 p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
