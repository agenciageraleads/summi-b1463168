
import { useAuth } from '@/contexts/AuthContext';

export const Header = () => {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-summi-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-summi-gray-900">
            Olá, {user?.name}! 👋
          </h1>
          <p className="text-summi-gray-600">
            Vamos verificar como está o atendimento hoje
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-summi-gray-600 hover:text-summi-blue transition-colors">
            <span className="text-xl">🔔</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          {/* User Avatar */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-summi-blue rounded-full flex items-center justify-center">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-medium">
                  {user?.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="text-sm">
              <p className="font-medium text-summi-gray-900">{user?.name}</p>
              <p className="text-summi-gray-600 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
