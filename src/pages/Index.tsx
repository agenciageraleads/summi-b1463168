
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-summi-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-summi-blue rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-summi-blue mx-auto"></div>
        </div>
      </div>
    );
  }

  return null;
};

export default Index;
