
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Settings, Users, PieChart, MessageSquare, X, User, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useBetaFeatures } from '@/hooks/useBetaFeatures';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { profile } = useProfile();
  const { isBetaUser } = useBetaFeatures();

  // Fechar sidebar automaticamente no mobile quando rota muda
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      onClose();
    }
  }, [location.pathname, onClose]);

  // Fechar sidebar quando clicar em qualquer link no mobile
  const handleLinkClick = () => {
    if (window.innerWidth < 1024) { // mobile/tablet
      onClose();
    }
  };

  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Configurações', path: '/settings', icon: Settings },
    { name: 'Assinatura', path: '/subscription', icon: PieChart },
    { name: 'Indicações', path: '/referrals', icon: Users },
    { name: 'Feedback', path: '/feedback', icon: MessageSquare },
  ];

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:shadow-lg
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-summi-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <img 
                src="/lovable-uploads/3cf7feb3-ab92-46ee-85a8-7706495a4bcf.png" 
                alt="Summi" 
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-xl font-bold text-summi-green">Summi</h1>
          </div>
          
          {/* Botão de fechar apenas no mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-summi-gray-100"
          >
            <X className="w-5 h-5 text-summi-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                  ${location.pathname === item.path
                    ? 'bg-summi-green text-white'
                    : 'text-summi-gray-700 hover:bg-summi-gray-100'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            ))}

            {/* Beta Features - visível para admin ou beta */}
            {isBetaUser && (
              <Link
                to="/beta"
                onClick={handleLinkClick}
                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                  ${location.pathname === '/beta'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-600 hover:bg-purple-50'
                  }
                `}
              >
                <MessageSquare className="w-5 h-5" />
                <span>Beta</span>
                <span className="ml-auto text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                  BETA
                </span>
              </Link>
            )}

            {/* Admin Panel - visível apenas para admins */}
            {profile?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={handleLinkClick}
                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                  ${location.pathname.startsWith('/admin')
                    ? 'bg-red-600 text-white'
                    : 'text-red-600 hover:bg-red-50'
                  }
                `}
              >
                <Settings className="w-5 h-5" />
                <span>Painel do Admin</span>
              </Link>
            )}
          </div>
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-summi-gray-200 p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-summi-green rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-summi-gray-900 truncate">
                {profile?.nome || user?.email}
              </p>
              <p className="text-xs text-summi-gray-500 truncate">
                {user?.email}
              </p>
              {profile?.role && profile.role !== 'user' && (
                <span className="inline-block text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full mt-1">
                  {profile.role}
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={() => {
              logout();
              handleLinkClick(); // Fechar sidebar no mobile
            }}
            className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
