
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { Menu, X, Bell } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useChats } from '@/hooks/useChats';
import { Shield } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Configurações', href: '/settings', icon: '⚙️' },
  { name: 'Assinatura', href: '/subscription', icon: '💳' },
  { name: 'Feedback', href: '/feedback', icon: '💬' },
];

export const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { profile } = useProfile();
  const { chats } = useChats();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const displayName = profile?.nome || user?.email || 'Usuário';
  const pendingChats = chats.filter(chat => 
    chat.prioridade === 'urgente' || chat.prioridade === 'importante'
  ).length;
  
  // Verificar se é admin - acessando diretamente os dados do profile
  const isAdmin = (profile as any)?.role === 'admin';

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-lg"
        onClick={toggleMobileMenu}
      >
        {isMobileMenuOpen ? (
          <X className="w-5 h-5 text-gray-600" />
        ) : (
          <Menu className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "flex flex-col w-64 bg-white border-r border-gray-200 h-full transition-transform duration-300 ease-in-out z-40",
        "md:translate-x-0 md:static md:z-auto",
        isMobileMenuOpen ? "fixed translate-x-0" : "fixed -translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8">
              <img 
                src="/lovable-uploads/8d37281c-dfb2-4e98-93c9-888cccd6a706.png" 
                alt="Summi Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl font-bold text-green-600">Summi</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                location.pathname === item.href
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:bg-green-100 hover:text-green-600"
              )}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
          
          {/* Admin Panel Link - só mostra para admins */}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200"
            >
              <Shield className="mr-3 h-5 w-5" />
              Painel Admin
            </Link>
          )}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-200 mt-auto space-y-4">
          {/* Notifications */}
          <Link to="/dashboard" className="relative p-2 text-gray-600 hover:text-green-600 transition-colors flex items-center justify-between hover:bg-green-100 rounded-lg">
            <div className="flex items-center">
              <Bell className="w-5 h-5 mr-3" />
              <span className="text-sm font-medium">Notificações</span>
            </div>
            {pendingChats > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {pendingChats > 99 ? '99+' : pendingChats}
              </span>
            )}
          </Link>
          
          {/* User Avatar & Info */}
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-100">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-medium">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-sm overflow-hidden">
              <p className="font-medium text-gray-900 truncate" title={displayName}>{displayName}</p>
              <p className="text-gray-600 truncate" title={user?.email}>{user?.email}</p>
              {isAdmin && (
                <p className="text-red-600 text-xs font-medium">ADMIN</p>
              )}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 hover:bg-green-100 hover:text-red-600 rounded-lg transition-colors"
          >
            <span className="mr-3 text-lg">🚪</span>
            Sair
          </button>
        </div>
      </div>
    </>
  );
};
