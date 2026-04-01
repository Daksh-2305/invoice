import { HashRouter, Routes, Route } from 'react-router-dom';
import { createContext, useContext, useState, useEffect } from 'react';
import { InvoiceProvider } from './context/InvoiceContext';
import { Layout } from './components/Layout';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceHistory from './pages/InvoiceHistory';
import Items from './pages/Items';
import Clients from './pages/Clients';
import BusinessProfile from './pages/BusinessProfile';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Estimates from './pages/Estimates';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import CreditNotes from './pages/CreditNotes';
import RecurringInvoices from './pages/RecurringInvoices';
import PurchaseOrders from './pages/PurchaseOrders';
import DeliveryChallans from './pages/DeliveryChallans';
import GSTReport from './pages/GSTReport';
import BarcodeScanner from './pages/BarcodeScanner';
import PartyLedger from './pages/PartyLedger';
import SharedInvoice from './pages/SharedInvoice';
import TaxCalendar from './pages/TaxCalendar';
import { BusinessRegistration } from './components/BusinessRegistration';
import Explore from './pages/Explore';
import { AndroidBackButton } from './components/AndroidBackButton';

// ─── Theme Context ───────────────────────────────────────────
type Theme = 'light' | 'dark';
interface ThemeContextValue { theme: Theme; setTheme: (t: Theme) => void; }
export const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', setTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

function App() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('billsaathi_theme');
    return (saved === 'dark' ? 'dark' : 'light');
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('billsaathi_theme', t);
  };

  // Apply .dark class to <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <InvoiceProvider>
        <BusinessRegistration />
        <HashRouter>
          <AndroidBackButton />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="create" element={<CreateInvoice />} />
              <Route path="history" element={<InvoiceHistory />} />
              <Route path="estimates" element={<Estimates />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="reports" element={<Reports />} />
              <Route path="credit-notes" element={<CreditNotes />} />
              <Route path="recurring" element={<RecurringInvoices />} />
              <Route path="purchase-orders" element={<PurchaseOrders />} />
              <Route path="challans" element={<DeliveryChallans />} />
              <Route path="gst-report" element={<GSTReport />} />
              <Route path="barcode" element={<BarcodeScanner />} />
              <Route path="ledger" element={<PartyLedger />} />
              <Route path="share-links" element={<SharedInvoice />} />
              <Route path="calendar" element={<TaxCalendar />} />
              <Route path="items" element={<Items />} />
               <Route path="clients" element={<Clients />} />
              <Route path="profile" element={<BusinessProfile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="explore" element={<Explore />} />
            </Route>
          </Routes>
        </HashRouter>
      </InvoiceProvider>
    </ThemeContext.Provider>
  );
}

export default App;
