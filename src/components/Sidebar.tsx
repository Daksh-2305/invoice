import { NavLink } from 'react-router-dom';
import { FileText, History, Moon, Sun, Package, Users, Building2, LayoutDashboard, Settings as SettingsIcon, ClipboardList, Wallet, BarChart3, RotateCcw, ShoppingCart, FileCheck, Truck, FileSpreadsheet, ScanLine, BookOpen, Share2, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { useInvoice } from '../context/InvoiceContext';

export function Sidebar() {
  const { config, updateConfig } = useInvoice();

  const toggleTheme = () => {
    updateConfig({ theme: config.theme === 'dark' ? 'light' : 'dark' });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200",
      isActive ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
    );

  return (
    <aside className="app-sidebar w-64 border-r border-border/40 bg-card h-screen sticky top-0 hidden lg:flex flex-col pt-safe-area-inset-top backdrop-blur-2xl text-card-foreground min-h-screen p-4 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-colors duration-500 z-20">
      <div className="flex items-center space-x-3 mb-10 px-2 group cursor-pointer">
        <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/30 transform transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 rounded-2xl" />
          <span className="relative text-white font-black text-2xl leading-none tracking-tight" style={{fontFamily:'Georgia,serif'}}>Bs</span>
        </div>
        <div className="flex flex-col">
          <span className="font-black text-3xl tracking-tighter bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent leading-none">BillSaathi</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 px-4 mb-1">Main</p>
        <NavLink to="/" end className={linkClass}><LayoutDashboard className="w-4 h-4" /><span>Dashboard</span></NavLink>
        <NavLink to="/create" className={linkClass}><FileText className="w-4 h-4" /><span>Create Invoice</span></NavLink>
        <NavLink to="/history" className={linkClass}><History className="w-4 h-4" /><span>Invoices</span></NavLink>
        <NavLink to="/estimates" className={linkClass}><ClipboardList className="w-4 h-4" /><span>Estimates</span></NavLink>

        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 px-4 mt-4 mb-1">Finance</p>
        <NavLink to="/expenses" className={linkClass}><Wallet className="w-4 h-4" /><span>Expenses</span></NavLink>
        <NavLink to="/reports" className={linkClass}><BarChart3 className="w-4 h-4" /><span>P&L Report</span></NavLink>
        <NavLink to="/credit-notes" className={linkClass}><FileCheck className="w-4 h-4" /><span>Credit Notes</span></NavLink>
        <NavLink to="/gst-report" className={linkClass}><FileSpreadsheet className="w-4 h-4" /><span>GST Report</span></NavLink>
        <NavLink to="/calendar" className={linkClass}><Calendar className="w-4 h-4" /><span>GST Calendar</span></NavLink>

        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 px-4 mt-4 mb-1">Business Insights</p>
        <NavLink to="/ledger" className={linkClass}><BookOpen className="w-4 h-4" /><span>Party Ledger</span></NavLink>
        <NavLink to="/share-links" className={linkClass}><Share2 className="w-4 h-4" /><span>Online Links</span></NavLink>

        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 px-4 mt-4 mb-1">Operations</p>
        <NavLink to="/recurring" className={linkClass}><RotateCcw className="w-4 h-4" /><span>Recurring</span></NavLink>
        <NavLink to="/purchase-orders" className={linkClass}><ShoppingCart className="w-4 h-4" /><span>Purchase Orders</span></NavLink>
        <NavLink to="/challans" className={linkClass}><Truck className="w-4 h-4" /><span>Challans</span></NavLink>
        <NavLink to="/items" className={linkClass}><Package className="w-4 h-4" /><span>Inventory</span></NavLink>
        <NavLink to="/barcode" className={linkClass}><ScanLine className="w-4 h-4" /><span>Barcode</span></NavLink>
        <NavLink to="/clients" className={linkClass}><Users className="w-4 h-4" /><span>Clients</span></NavLink>

        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 px-4 mt-4 mb-1">Settings</p>
        <NavLink to="/profile" className={linkClass}><Building2 className="w-4 h-4" /><span>Business</span></NavLink>
        <NavLink to="/settings" className={linkClass}><SettingsIcon className="w-4 h-4" /><span>Settings</span></NavLink>
      </nav>

      <div className="mt-auto border-t pt-3">
        <button onClick={toggleTheme}
          className="flex items-center space-x-3 w-full px-4 py-2.5 rounded-lg font-medium text-sm text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors">
          {config.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{config.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
    </aside>
  );
}
