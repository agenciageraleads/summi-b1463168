// ABOUTME: Sidebar de navegação para o painel administrativo com suporte mobile
// ABOUTME: Usa Sheet/hamburger menu no mobile e sidebar fixa no desktop

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BarChart3, Users, ArrowLeft, TestTube, MessageSquare, DollarSign, FileText, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: BarChart3 },
  { name: 'Usuários', href: '/admin/users', icon: Users },
  { name: 'Usuários Beta', href: '/admin/beta-users', icon: TestTube },
  { name: 'Anúncios', href: '/admin/announcements', icon: MessageSquare },
  { name: 'Billing', href: '/admin/billing', icon: DollarSign },
  { name: 'Blog', href: '/admin/blog', icon: FileText },
];

// Mapeamento de rotas para títulos das páginas admin
const ADMIN_PAGE_TITLES: Record<string, string> = {
  '/admin': 'Admin',
  '/admin/users': 'Usuários',
  '/admin/beta-users': 'Usuários Beta',
  '/admin/announcements': 'Anúncios',
  '/admin/billing': 'Billing',
  '/admin/blog': 'Blog',
};

export const AdminSidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  // Título da página atual
  const currentPageTitle = ADMIN_PAGE_TITLES[location.pathname] || 'Admin';

  const handleNavClick = () => {
    setIsMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col w-full bg-gray-900 h-full">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-xl font-bold text-white">Admin</span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={handleNavClick}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                location.pathname === item.href
                  ? "bg-red-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Ações */}
      <div className="p-4 border-t border-gray-700 space-y-2">
        <Link
          to="/dashboard"
          role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={handleNavClick}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
        >
          <ArrowLeft className="mr-3 h-5 w-5" />
          Voltar ao Dashboard
        </Link>

        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-red-400 rounded-lg transition-colors"
        >
          <span className="mr-3 text-lg">🚪</span>
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Barra de topo mobile dedicada — Admin */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900 border-b border-gray-700 z-50 flex items-center px-4">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-white hover:bg-gray-800"
              aria-label="Abrir menu admin"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-gray-700">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <div className="flex items-center ml-3 space-x-2">
          <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <span className="font-semibold text-base text-white truncate">
            {currentPageTitle}
          </span>
        </div>
      </div>

      {/* Desktop Sidebar — visível apenas em lg+ */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <SidebarContent />
      </div>
    </>
  );
};