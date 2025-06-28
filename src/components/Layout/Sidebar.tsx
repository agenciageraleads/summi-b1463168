
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Settings, 
  CreditCard, 
  Users, 
  MessageSquare, 
  TestTube,
  LogOut,
  X,
  Menu
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// Sidebar corrigida com funcionalidade mobile e itens corretos
export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profile } = useProfile();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  // Navegação principal do usuário
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Configurações', href: '/settings', icon: Settings },
    { name: 'Assinatura', href: '/subscription', icon: CreditCard },
    { name: 'Indicações', href: '/referrals', icon: Users },
    { name: 'Feedback', href: '/feedback', icon: MessageSquare },
  ];

  // Adicionar itens condicionais baseados no role do usuário
  const conditionalNavigation = [];
  
  // Beta para admin e beta users
  if (profile?.role === 'admin' || profile?.role === 'beta') {
    conditionalNavigation.push({
      name: 'Beta',
      href: '/beta',
      icon: TestTube,
    });
  }

  // Admin panel apenas para admins
  if (profile?.role === 'admin') {
    conditionalNavigation.push({
      name: 'Painel do Admin',
      href: '/admin',
      icon: BarChart3,
    });
  }

  const allNavigation = [...navigation, ...conditionalNavigation];

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsMobileOpen(false);
  };

  const handleNavClick = () => {
    setIsMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo/Header */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-summi-green rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-xl font-bold text-summi-gray-900">Summi</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {allNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={handleNavClick}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-summi-green text-white"
                  : "text-summi-gray-700 hover:bg-summi-gray-100 hover:text-summi-green"
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-summi-green flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {profile?.nome?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-summi-gray-900 truncate">
              {profile?.nome || 'Usuário'}
            </p>
            <p className="text-xs text-summi-gray-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center justify-center space-x-2 text-summi-gray-700 hover:text-red-600 hover:border-red-300"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button - Visível apenas no mobile */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-white shadow-lg border-gray-200"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar - Visível apenas no desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <SidebarContent />
      </div>
    </>
  );
};
