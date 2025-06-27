
// ABOUTME: Sidebar principal do dashboard com navegação simplificada.
// ABOUTME: Remove aba de assinatura conforme estratégia de UX focada no produto.

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { 
  Home, 
  MessageSquare, 
  Settings, 
  LogOut, 
  User,
  Shield,
  Users,
  Megaphone,
  MessageCircle
} from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-summi-gradient rounded-lg flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-summi-gray-900">Summi</h2>
            <p className="text-sm text-summi-gray-600">
              {profile?.nome?.split(' ')[0] || 'Usuário'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <Button
          variant={isActive('/dashboard') ? 'default' : 'ghost'}
          className={`w-full justify-start ${
            isActive('/dashboard') 
              ? 'bg-summi-green text-white' 
              : 'text-summi-gray-700 hover:text-summi-green hover:bg-summi-green/10'
          }`}
          onClick={() => handleNavigation('/dashboard')}
        >
          <Home className="mr-3 h-4 w-4" />
          Dashboard
        </Button>

        <Button
          variant={isActive('/whatsapp-connection') ? 'default' : 'ghost'}
          className={`w-full justify-start ${
            isActive('/whatsapp-connection') 
              ? 'bg-summi-green text-white' 
              : 'text-summi-gray-700 hover:text-summi-green hover:bg-summi-green/10'
          }`}
          onClick={() => handleNavigation('/whatsapp-connection')}
        >
          <MessageCircle className="mr-3 h-4 w-4" />
          Conexão WhatsApp
        </Button>

        <Button
          variant={isActive('/settings') ? 'default' : 'ghost'}
          className={`w-full justify-start ${
            isActive('/settings') 
              ? 'bg-summi-green text-white' 
              : 'text-summi-gray-700 hover:text-summi-green hover:bg-summi-green/10'
          }`}
          onClick={() => handleNavigation('/settings')}
        >
          <Settings className="mr-3 h-4 w-4" />
          Configurações
        </Button>

        {/* Admin Section */}
        {profile?.role === 'admin' && (
          <>
            <Separator className="my-4" />
            <div className="px-2 py-2">
              <h3 className="text-xs font-semibold text-summi-gray-500 uppercase tracking-wider">
                Admin
              </h3>
            </div>
            
            <Button
              variant={isActive('/admin') ? 'default' : 'ghost'}
              className={`w-full justify-start ${
                isActive('/admin') 
                  ? 'bg-red-600 text-white' 
                  : 'text-red-600 hover:text-red-700 hover:bg-red-50'
              }`}
              onClick={() => handleNavigation('/admin')}
            >
              <Shield className="mr-3 h-4 w-4" />
              Painel Admin
            </Button>

            <Button
              variant={isActive('/admin/users') ? 'default' : 'ghost'}
              className={`w-full justify-start ${
                isActive('/admin/users') 
                  ? 'bg-red-600 text-white' 
                  : 'text-red-600 hover:text-red-700 hover:bg-red-50'
              }`}
              onClick={() => handleNavigation('/admin/users')}
            >
              <Users className="mr-3 h-4 w-4" />
              Usuários
            </Button>

            <Button
              variant={isActive('/admin/announcements') ? 'default' : 'ghost'}
              className={`w-full justify-start ${
                isActive('/admin/announcements') 
                  ? 'bg-red-600 text-white' 
                  : 'text-red-600 hover:text-red-700 hover:bg-red-50'
              }`}
              onClick={() => handleNavigation('/admin/announcements')}
            >
              <Megaphone className="mr-3 h-4 w-4" />
              Anúncios
            </Button>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-summi-gray-700 hover:text-summi-gray-900"
          onClick={handleSignOut}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export { Sidebar };
