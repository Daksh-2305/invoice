import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Device } from '@capacitor/device';

import type { Invoice, AppConfig, Estimate, Expense, CreditNote, PurchaseOrder, RecurringTemplate, DeliveryChallan } from '../types';

interface InvoiceContextProps {
  // Invoices
  invoices: Invoice[];
  saveInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  updateInvoiceStatus: (id: string, status: Invoice['status'], amountPaid?: number) => void;
  // Estimates
  estimates: Estimate[];
  saveEstimate: (estimate: Estimate) => void;
  deleteEstimate: (id: string) => void;
  // Expenses
  expenses: Expense[];
  saveExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  // Credit Notes
  creditNotes: CreditNote[];
  saveCreditNote: (cn: CreditNote) => void;
  deleteCreditNote: (id: string) => void;
  // Purchase Orders
  purchaseOrders: PurchaseOrder[];
  savePurchaseOrder: (po: PurchaseOrder) => void;
  deletePurchaseOrder: (id: string) => void;
  // Recurring
  recurringTemplates: RecurringTemplate[];
  saveRecurringTemplate: (t: RecurringTemplate) => void;
  deleteRecurringTemplate: (id: string) => void;
  // Delivery Challans
  challans: DeliveryChallan[];
  saveChallan: (ch: DeliveryChallan) => void;
  deleteChallan: (id: string) => void;
  // Config
  config: AppConfig;
  updateConfig: (config: Partial<AppConfig>) => void;
  // Items & Clients
  saveItem: (item: import('../types').SavedItem) => void;
  deleteItem: (id: string) => void;
  saveClient: (client: import('../types').SavedClient) => void;
  deleteClient: (id: string) => void;
  // Inventory
  adjustStock: (itemId: string, quantityChange: number) => void;
}

const defaultConfig: AppConfig = {
  theme: 'dark',
  colorTheme: 'sunset',
  defaultTheme: 'minimal',
  defaultCurrency: 'INR',
  defaultLanguage: 'en',
  lastInvoiceNumber: 0,
  lastEstimateNumber: 0,
  lastCreditNoteNumber: 0,
  lastPONumber: 0,
  lastChallanNumber: 0,
  savedBusinessDetails: null,
  savedItems: [],
  savedClients: [],
};

const InvoiceContext = createContext<InvoiceContextProps | undefined>(undefined);

function useLocalState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(defaultValue);

  useEffect(() => {
    const load = async () => {
      const { value } = await Preferences.get({ key });
      if (value) {
        setState(JSON.parse(value));
      } else {
        // Fallback to localStorage just once for migration
        const legacy = localStorage.getItem(key);
        if (legacy) {
          setState(JSON.parse(legacy));
          await Preferences.set({ key, value: legacy });
        }
      }
    };
    load();
  }, [key]);

  useEffect(() => {
    const save = async () => {
      await Preferences.set({ key, value: JSON.stringify(state) });
    };
    save();
  }, [key, state]);

  return [state, setState];
}

export const InvoiceProvider = ({ children }: { children: ReactNode }) => {
  const [invoices, setInvoices] = useLocalState<Invoice[]>('quickbill_invoices', []);
  const [estimates, setEstimates] = useLocalState<Estimate[]>('quickbill_estimates', []);
  const [expenses, setExpenses] = useLocalState<Expense[]>('quickbill_expenses', []);
  const [creditNotes, setCreditNotes] = useLocalState<CreditNote[]>('quickbill_credit_notes', []);
  const [purchaseOrders, setPurchaseOrders] = useLocalState<PurchaseOrder[]>('quickbill_purchase_orders', []);
  const [recurringTemplates, setRecurringTemplates] = useLocalState<RecurringTemplate[]>('quickbill_recurring', []);
  const [challans, setChallans] = useLocalState<DeliveryChallan[]>('quickbill_challans', []);

  const [config, setConfig] = useState<AppConfig>(defaultConfig);

  useEffect(() => {
    const loadConfig = async () => {
      const { value } = await Preferences.get({ key: 'quickbill_config' });
      if (value) {
        setConfig({ ...defaultConfig, ...JSON.parse(value) });
      } else {
        const legacy = localStorage.getItem('quickbill_config');
        if (legacy) {
          setConfig({ ...defaultConfig, ...JSON.parse(legacy) });
          await Preferences.set({ key: 'quickbill_config', value: legacy });
        }
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    const saveConfig = async () => {
      await Preferences.set({ key: 'quickbill_config', value: JSON.stringify(config) });
    };
    saveConfig();
    
    if (config.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.classList.add('theme-sunset');

    // Sync Native StatusBar
    const syncStatusBar = async () => {
      try {
        const info = await Device.getInfo();
        if (info.platform === 'android' || info.platform === 'ios') {
          await StatusBar.setStyle({ 
            style: config.theme === 'dark' ? Style.Dark : Style.Light 
          });
          // On Android, we make it transparent so safe-area-inset-top works
          if (info.platform === 'android') {
             await StatusBar.setOverlaysWebView({ overlay: true });
          }
        }
      } catch (e) {
        console.warn('StatusBar not available', e);
      }
    };
    syncStatusBar();
  }, [config]);

  // ── Invoice CRUD ──
  const saveInvoice = (invoice: Invoice) => {
    setInvoices((prev) => {
      const exists = prev.find((inv) => inv.id === invoice.id);
      if (exists) return prev.map((inv) => (inv.id === invoice.id ? invoice : inv));
      return [invoice, ...prev];
    });
  };

  const deleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  };

  const updateInvoiceStatus = (id: string, status: Invoice['status'], amountPaid?: number) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, status, amountPaid: amountPaid ?? inv.amountPaid ?? 0 } : inv
      )
    );
  };

  // ── Estimate CRUD ──
  const saveEstimate = (estimate: Estimate) => {
    setEstimates((prev) => {
      const exists = prev.find((e) => e.id === estimate.id);
      if (exists) return prev.map((e) => (e.id === estimate.id ? estimate : e));
      return [estimate, ...prev];
    });
  };
  const deleteEstimate = (id: string) => setEstimates((prev) => prev.filter((e) => e.id !== id));

  // ── Expense CRUD ──
  const saveExpense = (expense: Expense) => {
    setExpenses((prev) => {
      const exists = prev.find((e) => e.id === expense.id);
      if (exists) return prev.map((e) => (e.id === expense.id ? expense : e));
      return [expense, ...prev];
    });
  };
  const deleteExpense = (id: string) => setExpenses((prev) => prev.filter((e) => e.id !== id));

  // ── Credit Note CRUD ──
  const saveCreditNote = (cn: CreditNote) => {
    setCreditNotes((prev) => {
      const exists = prev.find((c) => c.id === cn.id);
      if (exists) return prev.map((c) => (c.id === cn.id ? cn : c));
      return [cn, ...prev];
    });
  };
  const deleteCreditNote = (id: string) => setCreditNotes((prev) => prev.filter((c) => c.id !== id));

  // ── Purchase Order CRUD ──
  const savePurchaseOrder = (po: PurchaseOrder) => {
    setPurchaseOrders((prev) => {
      const exists = prev.find((p) => p.id === po.id);
      if (exists) return prev.map((p) => (p.id === po.id ? po : p));
      return [po, ...prev];
    });
  };
  const deletePurchaseOrder = (id: string) => setPurchaseOrders((prev) => prev.filter((p) => p.id !== id));

  // ── Recurring Template CRUD ──
  const saveRecurringTemplate = (t: RecurringTemplate) => {
    setRecurringTemplates((prev) => {
      const exists = prev.find((r) => r.id === t.id);
      if (exists) return prev.map((r) => (r.id === t.id ? t : r));
      return [t, ...prev];
    });
  };
  const deleteRecurringTemplate = (id: string) => setRecurringTemplates((prev) => prev.filter((r) => r.id !== id));

  // ── Config ──
  const updateConfig = (newConfig: Partial<AppConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  // ── Items & Clients ──
  const saveItem = (item: import('../types').SavedItem) => {
    setConfig((prev) => {
      const existing = prev.savedItems.find((i) => i.id === item.id);
      const newItems = existing
        ? prev.savedItems.map((i) => (i.id === item.id ? item : i))
        : [...prev.savedItems, item];
      return { ...prev, savedItems: newItems };
    });
  };

  const deleteItem = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      savedItems: prev.savedItems.filter((i) => i.id !== id),
    }));
  };

  const saveClient = (client: import('../types').SavedClient) => {
    setConfig((prev) => {
      const existing = prev.savedClients.find((c) => c.id === client.id);
      const newClients = existing
        ? prev.savedClients.map((c) => (c.id === client.id ? client : c))
        : [...prev.savedClients, client];
      return { ...prev, savedClients: newClients };
    });
  };

  const deleteClient = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      savedClients: prev.savedClients.filter((c) => c.id !== id),
    }));
  };

  // ── Inventory Stock ──
  const adjustStock = (itemId: string, quantityChange: number) => {
    setConfig((prev) => ({
      ...prev,
      savedItems: prev.savedItems.map((item) =>
        item.id === itemId && item.stock !== undefined
          ? { ...item, stock: Math.max(0, (item.stock || 0) + quantityChange) }
          : item
      ),
    }));
  };

  // ── Delivery Challan CRUD ──
  const saveChallan = (ch: DeliveryChallan) => {
    setChallans((prev) => {
      const exists = prev.find((c) => c.id === ch.id);
      if (exists) return prev.map((c) => (c.id === ch.id ? ch : c));
      return [ch, ...prev];
    });
  };
  const deleteChallan = (id: string) => setChallans((prev) => prev.filter((c) => c.id !== id));

  return (
    <InvoiceContext.Provider
      value={{
        invoices, saveInvoice, deleteInvoice, updateInvoiceStatus,
        estimates, saveEstimate, deleteEstimate,
        expenses, saveExpense, deleteExpense,
        creditNotes, saveCreditNote, deleteCreditNote,
        purchaseOrders, savePurchaseOrder, deletePurchaseOrder,
        recurringTemplates, saveRecurringTemplate, deleteRecurringTemplate,
        challans, saveChallan, deleteChallan,
        config, updateConfig,
        saveItem, deleteItem, saveClient, deleteClient,
        adjustStock,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
};

export const useInvoice = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoice must be used within an InvoiceProvider');
  }
  return context;
};
