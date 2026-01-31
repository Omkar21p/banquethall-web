import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  LayoutDashboard,
  Briefcase,
  Package,
  Calendar,
  FileText,
  FolderOpen,
  Settings,
  LogOut,
  Globe,
  Users,
  Building2
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { admin, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  if (!admin) {
    navigate('/admin/login');
    return null;
  }

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: t('Dashboard', 'डॅशबोर्ड') },
    { path: '/admin/halls', icon: Building2, label: t('Hall Settings', 'हॉल सेटिंग्ज') },
    { path: '/admin/services', icon: Briefcase, label: t('Services', 'सेवा') },
    { path: '/admin/packages', icon: Package, label: t('Packages', 'पॅकेजेस') },
    { path: '/admin/calendar', icon: Calendar, label: t('Calendar', 'कॅलेंडर') },
    { path: '/admin/bills/new', icon: FileText, label: t('New Bill', 'नविन बिल') },
    { path: '/admin/bills', icon: FolderOpen, label: t('Older Bookings', 'जुनी बुकिंग') },
    { path: '/admin/users', icon: Users, label: t('Manage Admins', 'प्रशासक व्यवस्थापन') },
    { path: '/admin/settings', icon: Settings, label: t('Settings', 'सेटिंग्ज') },
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="flex h-screen bg-[#FDFBF7]">
      <aside className="w-64 admin-sidebar text-white">
        <div className="p-6">
          <h2 className="playfair text-2xl font-bold mb-2">{admin.hall_name}</h2>
          <p className="text-sm opacity-90">{admin.username}</p>
        </div>

        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                  isActive ? 'bg-[#600000] border-l-4 border-[#D4AF37]' : 'hover:bg-[#600000]'
                }`}
                data-testid={`menu-${item.path}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-6 py-3 mt-auto absolute bottom-6 left-0 w-64 hover:bg-[#600000] transition-colors"
          data-testid="logout-btn"
        >
          <LogOut size={20} />
          <span>{t('Logout', 'लॉगआउट')}</span>
        </button>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-8">
          <h1 className="playfair text-2xl font-bold maroon-text">
            {menuItems.find(item => item.path === location.pathname)?.label || t('Dashboard', 'डॅशबोर्ड')}
          </h1>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#D4AF37] text-[#800000] hover:bg-[#D4AF37] hover:text-white transition-all"
            data-testid="language-toggle-btn"
          >
            <Globe size={20} />
            {language === 'en' ? 'मराठी' : 'English'}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;