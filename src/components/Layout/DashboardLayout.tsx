
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-summi-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden md:ml-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 mt-16 md:mt-0">
          {children}
        </main>
      </div>
    </div>
  );
};
