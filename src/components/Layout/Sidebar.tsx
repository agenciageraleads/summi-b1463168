
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Settings, MessageSquare, PieChart, LogOut, Star } from 'lucide-react';
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
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', icon: Home, path: '/dashboard' },
  { label: 'WhatsApp', icon: MessageSquare, path: '/whatsapp' },
  { label: 'Usuários', icon: Users, path: '/admin/users' },
  { label: 'Relatórios', icon: PieChart, path: '/reports' },
  { label: 'Configurações', icon: Settings, path: '/settings' },
  { label: 'Indique e Ganhe', icon: Star, path: '/referrals' },
];

export const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const { profile, isLoading } = useProfile();

  return (
    <div className="w-64 bg-white border-r border-summi-gray-200 flex flex-col">
      {/* Header Section */}
      <div className="flex items-center justify-center h-16 border-b border-summi-gray-200">
        {/* Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                {isLoading ? (
                  <Skeleton className="h-8 w-8 rounded-full" />
                ) : profile?.avatar ? (
                  <AvatarImage src={profile.avatar} alt={profile?.name || profile?.nome} />
                ) : (
                  <AvatarFallback>{(profile?.name || profile?.nome)?.charAt(0).toUpperCase()}</AvatarFallback>
                )}
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { }} >
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { }}>
              Plano
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            // Aplicar highlight especial no botão de configurações para o onboarding
            if (item.path === '/settings') {
              return (
                <OnboardingHighlight key={item.path} targetId="settings-button">
                  <Link
                    to={item.path}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-summi-blue text-white'
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
                    ? 'bg-summi-blue text-white'
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

      {/* Footer Section */}
      <div className="p-4 border-t border-summi-gray-200">
        <p className="text-sm text-summi-gray-500">
          © {new Date().getFullYear()} Summi.
          <br />
          Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};
