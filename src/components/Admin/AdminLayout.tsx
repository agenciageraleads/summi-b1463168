
// ABOUTME: Layout principal do painel administrativo com sidebar responsiva.
// ABOUTME: Gerencia estado de abertura do menu lateral e fornece estrutura base.

import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header com botão do menu para mobile */}
        <header className="bg-white border-b border-gray-200 p-4 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSidebarToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
