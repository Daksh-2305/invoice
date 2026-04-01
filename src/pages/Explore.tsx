import { Link } from 'react-router-dom';
import { 
  FileText, History, ClipboardList, BarChart3, 
  Package, ShoppingCart, FileCheck, Truck, FileSpreadsheet, 
  ScanLine, BookOpen, Share2, RotateCcw, Users, Building2, 
  Settings as SettingsIcon, Calendar, LayoutGrid, ChevronRight,
  Download
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';

export default function Explore() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };
  const categories = [
    {
      title: "Transactions",
      items: [
        { title: "Create Invoice", icon: FileText, path: "/create", color: "text-blue-500", bg: "bg-blue-500/10" },
        { title: "Invoice History", icon: History, path: "/history", color: "text-purple-500", bg: "bg-purple-500/10" },
        { title: "Estimates", icon: ClipboardList, path: "/estimates", color: "text-indigo-500", bg: "bg-indigo-500/10" },
        { title: "Credit Notes", icon: FileCheck, path: "/credit-notes", color: "text-orange-500", bg: "bg-orange-500/10" },
        { title: "Recurring", icon: RotateCcw, path: "/recurring", color: "text-pink-500", bg: "bg-pink-500/10" },
      ]
    },
    {
      title: "Inventory & Clients",
      items: [
        { title: "Inventory", icon: Package, path: "/items", color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { title: "Purchase Orders", icon: ShoppingCart, path: "/purchase-orders", color: "text-cyan-500", bg: "bg-cyan-500/10" },
        { title: "Challans", icon: Truck, path: "/challans", color: "text-amber-500", bg: "bg-amber-500/10" },
        { title: "Party Ledger", icon: BookOpen, path: "/ledger", color: "text-rose-500", bg: "bg-rose-500/10" },
        { title: "Clients", icon: Users, path: "/clients", color: "text-blue-600", bg: "bg-blue-600/10" },
      ]
    },
    {
      title: "Reports & Compliance",
      items: [
        { title: "P&L Report", icon: BarChart3, path: "/reports", color: "text-violet-500", bg: "bg-violet-500/10" },
        { title: "GST Report", icon: FileSpreadsheet, path: "/gst-report", color: "text-green-600", bg: "bg-green-600/10" },
        { title: "GST Calendar", icon: Calendar, path: "/calendar", color: "text-red-500", bg: "bg-red-500/10" },
      ]
    },
    {
      title: "Tools & Settings",
      items: [
        { title: "Barcode Scanner", icon: ScanLine, path: "/barcode", color: "text-slate-600", bg: "bg-slate-600/10" },
        { title: "Online Links", icon: Share2, path: "/share-links", color: "text-sky-500", bg: "bg-sky-500/10" },
        { title: "Business Profile", icon: Building2, path: "/profile", color: "text-amber-600", bg: "bg-amber-600/10" },
        { title: "Settings", icon: SettingsIcon, path: "/settings", color: "text-slate-500", bg: "bg-slate-500/10" },
      ]
    }
  ];

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-primary/20 p-2 rounded-2xl">
          <LayoutGrid className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Explore</h1>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">All Business Tools</p>
        </div>
      </div>

      <div className="space-y-8">
        {deferredPrompt && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <h2 className="text-sm font-bold text-primary uppercase tracking-wider ml-1">App Experience</h2>
            <button
              onClick={handleInstall}
              className="w-full flex items-center p-4 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all group"
            >
              <div className="bg-white/20 p-2.5 rounded-xl mr-4">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-bold text-sm block">Install BillSaathi</span>
                <span className="text-[10px] opacity-80">Add to Home Screen for native experience</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          </div>
        )}

        {categories.map((category) => (
          <div key={category.title} className="space-y-3">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">{category.title}</h2>
            <div className="grid grid-cols-1 gap-2">
              {category.items.map((item) => (
                <Link
                  key={item.title}
                  to={item.path}
                  className="flex items-center p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-border/40 active:scale-[0.98] transition-all group shadow-sm"
                >
                  <div className={cn("p-2.5 rounded-xl mr-4", item.bg)}>
                    <item.icon className={cn("w-5 h-5", item.color)} />
                  </div>
                  <span className="font-bold text-sm text-foreground flex-1">{item.title}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
