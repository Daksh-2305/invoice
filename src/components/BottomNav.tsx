import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Wallet, LayoutGrid, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

export function BottomNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex flex-col items-center justify-center space-y-1 py-1 px-2 transition-all duration-300",
      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
    );

  return (
    <nav className="app-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-2xl border-t border-border/40 pb-safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto relative">
        <NavLink to="/" end className={linkClass}>
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium font-inter">Home</span>
        </NavLink>
        
        <NavLink to="/history" className={linkClass}>
          <History className="w-5 h-5" />
          <span className="text-[10px] font-medium font-inter">History</span>
        </NavLink>

        {/* FAB Placeholder space */}
        <div className="w-12" />

        <NavLink to="/expenses" className={linkClass}>
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] font-medium font-inter">Bills</span>
        </NavLink>

        <NavLink to="/explore" className={linkClass}>
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] font-medium font-inter">Explore</span>
        </NavLink>

        {/* Actual Floating Action Button */}
        <NavLink 
          to="/create" 
          className="absolute left-1/2 -translate-x-1/2 -top-6 bg-primary text-primary-foreground p-4 rounded-full shadow-[0_8px_24px_rgba(var(--primary-rgb),0.4)] active:scale-95 transition-transform duration-200 border-4 border-background"
        >
          <Plus className="w-6 h-6" />
        </NavLink>
      </div>
    </nav>
  );
}
