
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Configurações', href: '/settings', icon: '⚙️' },
  { name: 'Assinatura', href: '/subscription', icon: '💳' },
  { name: 'Feedback', href: '/feedback', icon: '💬' },
];

export const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-summi-gray-200 rounded-lg shadow-lg"
        onClick={toggleMobileMenu}
      >
        {isMobileMenuOpen ? (
          <X className="w-5 h-5 text-summi-gray-600" />
        ) : (
          <Menu className="w-5 h-5 text-summi-gray-600" />
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
        "flex flex-col w-64 bg-white border-r border-summi-gray-200 h-full transition-transform duration-300 ease-in-out z-40",
        "md:translate-x-0 md:static md:z-auto",
        isMobileMenuOpen ? "fixed translate-x-0" : "fixed -translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-center h-16 px-4 border-b border-summi-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-summi-green rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold text-summi-green">Summi</span>
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
                  ? "bg-summi-green text-white"
                  : "text-summi-gray-600 hover:bg-summi-gray-100 hover:text-summi-green"
              )}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-summi-gray-200">
          <button
            onClick={() => {
              logout();
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-summi-gray-600 hover:bg-summi-gray-100 hover:text-red-600 rounded-lg transition-colors"
          >
            <span className="mr-3 text-lg">🚪</span>
            Sair
          </button>
        </div>
      </div>
    </>
  );
};
