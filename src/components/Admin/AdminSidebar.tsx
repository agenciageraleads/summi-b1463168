
// ABOUTME: Sidebar de navegação do painel administrativo com fechamento automático em mobile.
// ABOUTME: Gerencia estado de abertura e navegação entre páginas administrativas.

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Users, 
  BarChart3, 
  MessageSquare, 
  Settings, 
  UserCheck,
  Megaphone,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: BarChart3 },
  { name: 'Usuários', href: '/admin/users', icon: Users },
  { name: 'Usuários Beta', href: '/admin/beta-users', icon: UserCheck },
  { name: 'Anúncios', href: '/admin/announcements', icon: Megaphone },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  const handleLinkClick = () => {
    // Fechar o menu automaticamente em mobile após clicar em um link
    onClose();
  };

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
      <div className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8">
              <img src="/lovable-uploads/8d37281c-dfb2-4e98-93c9-888cccd6a706.png" alt="Summi Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold text-red-600">Admin</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="mt-6">
          <div className="px-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    "group flex items-center px-3 py-2 mb-1 text-sm font-medium rounded-md transition-colors duration-200",
                    isActive
                      ? "bg-red-100 text-red-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn(
                    "mr-3 h-5 w-5",
                    isActive ? "text-red-500" : "text-gray-400 group-hover:text-gray-500"
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
};
