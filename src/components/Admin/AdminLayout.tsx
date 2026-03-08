
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* pt-[72px] compensa barra de topo mobile fixa (h-14 + respiro) */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-[72px] lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
};
