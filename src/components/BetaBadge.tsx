
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TestTube } from 'lucide-react';

interface BetaBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Componente para exibir badge beta
export const BetaBadge: React.FC<BetaBadgeProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge 
      className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white ${sizeClasses[size]} ${className}`}
    >
      <TestTube className={`${iconSizes[size]} mr-1`} />
      BETA
    </Badge>
  );
};
