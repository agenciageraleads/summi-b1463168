import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useChats } from '@/hooks/useChats';

export const Header = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { chats } = useChats();

  const displayName = profile?.nome || user?.email || 'Usuário';
  const firstName = displayName.split(' ')[0];
  const pendingChats = chats.filter(chat => 
    chat.prioridade === 'urgente' || chat.prioridade === 'importante'
  ).length;

  return (
    <header className="bg-white border-b border-summi-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-summi-gray-900">
            Olá, {firstName}! 👋
          </h1>
          <p className="text-summi-gray-600">
            Sua assistente de IA para WhatsApp que analisa e prioriza conversas automaticamente
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-summi-gray-600 hover:text-summi-green transition-colors">
            <span className="text-xl">🔔</span>
            {pendingChats > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {pendingChats > 99 ? '99+' : pendingChats}
              </span>
            )}
          </button>
          
          {/* User Avatar */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-summi-green rounded-full flex items-center justify-center">
              <span className="text-white font-medium">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-sm">
              <p className="font-medium text-summi-gray-900">{displayName}</p>
              <p className="text-summi-gray-600">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
