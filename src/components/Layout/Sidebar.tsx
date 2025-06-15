
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Settings, MessageSquare, LogOut, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile } from '@/hooks/useProfile';
import { OnboardingHighlight } from '@/components/Onboarding/OnboardingHighlight';

interface MenuItem {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  path: string;
  adminOnly?: boolean;
}

export const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const { profile, isLoading } = useProfile();

  // Itens do menu baseados na imagem fornecida
  const menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: Home, path: '/dashboard' },
    { label: 'Assinatura', icon: Star, path: '/subscription' },
    { label: 'Configurações', icon: Settings, path: '/settings' },
    { label: 'Indicações', icon: Users, path: '/referrals' },
    { label: 'Feedback', icon: MessageSquare, path: '/feedback' },
    { label: 'Painel Admin', icon: Settings, path: '/admin', adminOnly: true },
  ];

  // Filtrar itens baseado no perfil do usuário
  const filteredMenuItems = menuItems.filter(item => {
    if (item.adminOnly) {
      return profile?.role === 'admin';
    }
    return true;
  });

  return (
    <div className="w-64 bg-white border-r border-summi-gray-200 flex flex-col">
      {/* Header Section */}
      <div className="flex items-center justify-center h-16 border-b border-summi-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-summi-green rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-bold text-lg text-summi-gray-900">Summi</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <div className="space-y-2">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            // Aplicar highlight especial no botão de configurações para o onboarding
            if (item.path === '/settings') {
              return (
                <OnboardingHighlight key={item.path} targetId="settings-button">
                  <Link
                    to={item.path}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-summi-green text-white'
                        : 'text-summi-gray-700 hover:bg-summi-gray-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </OnboardingHighlight>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-summi-green text-white'
                    : 'text-summi-gray-700 hover:bg-summi-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Section com Avatar e Logout */}
      <div className="p-4 border-t border-summi-gray-200">
        <div className="flex items-center justify-between">
          {/* Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                <Avatar className="h-10 w-10">
                  {isLoading ? (
                    <Skeleton className="h-10 w-10 rounded-full" />
                  ) : profile?.avatar ? (
                    <AvatarImage src={profile.avatar} alt={profile?.name || profile?.nome} />
                  ) : (
                    <AvatarFallback className="bg-summi-green text-white">
                      {(profile?.name || profile?.nome)?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {profile?.name || profile?.nome || 'Usuário'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.email || 'email@exemplo.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Nome do usuário */}
          <div className="flex-1 ml-3">
            <p className="text-sm font-medium text-summi-gray-900">
              {isLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                profile?.name || profile?.nome || 'Usuário'
              )}
            </p>
            {profile?.role === 'admin' && (
              <p className="text-xs text-summi-green">ADMIN</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
