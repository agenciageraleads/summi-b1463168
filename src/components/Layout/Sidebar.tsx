
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'WhatsApp', href: '/whatsapp', icon: '📱' },
  { name: 'Relatórios', href: '/reports', icon: '📈' },
  { name: 'Configurações', href: '/settings', icon: '⚙️' },
];

export const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex flex-col w-64 bg-white border-r border-summi-gray-200 h-full">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-summi-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-summi-blue rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-xl font-bold text-summi-blue">Summi</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
              location.pathname === item.href
                ? "bg-summi-blue text-white"
                : "text-summi-gray-600 hover:bg-summi-gray-100 hover:text-summi-blue"
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
          onClick={logout}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-summi-gray-600 hover:bg-summi-gray-100 hover:text-red-600 rounded-lg transition-colors"
        >
          <span className="mr-3 text-lg">🚪</span>
          Sair
        </button>
      </div>
    </div>
  );
};
