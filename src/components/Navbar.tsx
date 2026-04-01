import { Moon, Sun } from 'lucide-react';
import { useInvoice } from '../context/InvoiceContext';

export function Navbar() {
  const { config, updateConfig } = useInvoice();

  const toggleTheme = () => {
    updateConfig({ theme: config.theme === 'dark' ? 'light' : 'dark' });
  };





  return (
    <header className="app-navbar sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-2xl transition-colors duration-500 pt-safe-area-inset-top">
      <div className="flex h-14 items-center px-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-3 mr-6 lg:hidden group">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 transition-transform active:scale-90 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 rounded-xl" />
            <span className="relative text-white font-black text-xl leading-none tracking-tight" style={{fontFamily:'Georgia,serif'}}>Bs</span>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tighter text-foreground leading-none">BillSaathi</span>
          </div>
        </div>

        {/* Desktop Nav links removed to avoid redundancy with Sidebar */}

        <div className="flex items-center ml-auto space-x-1">
          <button onClick={toggleTheme} className="p-2 rounded-full text-muted-foreground hover:bg-secondary transition-all" title="Dark/Light">
            {config.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown removed in favor of BottomNav */}
    </header>
  );
}
