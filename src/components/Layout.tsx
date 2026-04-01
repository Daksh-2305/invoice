import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-500 overflow-hidden relative">
      {/* Dynamic Ambient Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 dark:bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] rounded-full bg-ring/10 dark:bg-ring/5 blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-primary/5 dark:bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 overflow-y-auto relative z-10 w-full pb-20 lg:pb-0">
            <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
