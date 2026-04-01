import { useMemo, useState } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Users, Download, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function PartyLedger() {
  const { invoices, creditNotes, config } = useInvoice();
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [search, setSearch] = useState('');

  // Get all unique client names from invoices
  const allClients = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach(inv => { if (inv.clientDetails.name) set.add(inv.clientDetails.name); });
    creditNotes.forEach(cn => { if (cn.clientDetails.name) set.add(cn.clientDetails.name); });
    config.savedClients.forEach(c => { if (c.name) set.add(c.name); });
    return Array.from(set).sort();
  }, [invoices, creditNotes, config.savedClients]);

  const filteredClients = allClients.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  // Build ledger for selected client
  const ledger = useMemo(() => {
    if (!selectedClient) return { entries: [], totalInvoiced: 0, totalPaid: 0, totalCredits: 0, balance: 0, avgPaymentDays: 0 };

    type LedgerEntry = { date: string; type: 'invoice' | 'payment' | 'credit_note'; ref: string; debit: number; credit: number; balance: number; };
    const entries: LedgerEntry[] = [];
    let totalInvoiced = 0, totalPaid = 0, totalCredits = 0;
    const paymentDelays: number[] = [];

    // Invoices for this client
    const clientInvoices = invoices.filter(inv => inv.clientDetails.name === selectedClient);
    clientInvoices.forEach(inv => {
      const total = inv.items.reduce((s, i) => s + i.quantity * i.rate * (1 + i.gstPercent / 100), 0);
      totalInvoiced += total;
      entries.push({ date: inv.date, type: 'invoice', ref: inv.invoiceNumber, debit: total, credit: 0, balance: 0 });

      if (inv.amountPaid && inv.amountPaid > 0) {
        totalPaid += inv.amountPaid;
        entries.push({ date: inv.date, type: 'payment', ref: `Payment - ${inv.invoiceNumber}`, debit: 0, credit: inv.amountPaid, balance: 0 });
      }
    });

    // Credit notes for this client
    const clientCNs = creditNotes.filter(cn => cn.clientDetails.name === selectedClient);
    clientCNs.forEach(cn => {
      const total = cn.items.reduce((s, i) => s + i.quantity * i.rate * (1 + i.gstPercent / 100), 0);
      totalCredits += total;
      entries.push({ date: cn.date, type: 'credit_note', ref: cn.creditNoteNumber, debit: 0, credit: total, balance: 0 });
    });

    // Sort by date
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let running = 0;
    entries.forEach(e => {
      running += e.debit - e.credit;
      e.balance = running;
    });

    const balance = totalInvoiced - totalPaid - totalCredits;

    return { entries, totalInvoiced, totalPaid, totalCredits, balance, avgPaymentDays: paymentDelays.length > 0 ? Math.round(paymentDelays.reduce((a, b) => a + b, 0) / paymentDelays.length) : 0 };
  }, [selectedClient, invoices, creditNotes]);

  const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exportLedgerCSV = () => {
    if (!selectedClient || ledger.entries.length === 0) return;
    let csv = `Party Ledger: ${selectedClient}\nDate,Type,Reference,Debit,Credit,Balance\n`;
    ledger.entries.forEach(e => {
      csv += `"${e.date}","${e.type}","${e.ref}","${e.debit.toFixed(2)}","${e.credit.toFixed(2)}","${e.balance.toFixed(2)}"\n`;
    });
    csv += `\n,,Total Invoiced,${ledger.totalInvoiced.toFixed(2)},,\n`;
    csv += `,,Total Paid,,${ledger.totalPaid.toFixed(2)},\n`;
    csv += `,,Outstanding,,,${ledger.balance.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ledger_${selectedClient.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeColors: Record<string, string> = {
    invoice: 'text-red-600', payment: 'text-emerald-600', credit_note: 'text-blue-600',
  };
  const typeLabels: Record<string, string> = {
    invoice: 'Invoice', payment: 'Payment', credit_note: 'Credit Note',
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Party Ledger</h1>
        <p className="text-muted-foreground text-sm mt-1">Full transaction history per client with running balance.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Client List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Select Client</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-0.5">
              {filteredClients.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No clients found</p>
              ) : filteredClients.map(name => (
                <button key={name} onClick={() => setSelectedClient(name)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${selectedClient === name ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}>
                  {name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ledger Details */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedClient ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-foreground">Select a client</p>
                <p className="text-sm mt-1">Choose a client from the list to view their transaction history.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <div className="p-3 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                  <p className="text-[10px] uppercase font-bold text-red-500/70">Invoiced</p>
                  <p className="text-base sm:text-lg font-bold text-red-700 dark:text-red-400">{fmt(ledger.totalInvoiced)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                  <p className="text-[10px] uppercase font-bold text-emerald-500/70">Received</p>
                  <p className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">{fmt(ledger.totalPaid)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                  <p className="text-[10px] uppercase font-bold text-blue-500/70">Credits</p>
                  <p className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-400">{fmt(ledger.totalCredits)}</p>
                </div>
                <div className={`p-3 rounded-2xl border ${ledger.balance > 0 ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20' : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20'}`}>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground/70">Balance</p>
                  <p className={`text-base sm:text-lg font-bold ${ledger.balance > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{fmt(ledger.balance)}</p>
                </div>
              </div>

              {/* Transaction Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Transactions — {selectedClient}</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportLedgerCSV} disabled={ledger.entries.length === 0}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Export
                  </Button>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                  {ledger.entries.length === 0 ? (
                    <p className="text-center py-6 text-muted-foreground text-sm">No transactions for this client.</p>
                  ) : (
                    <>
                    {/* Desktop Table */}
                    <div className="hidden lg:block border rounded-md overflow-hidden overflow-x-auto">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-muted text-[11px] uppercase border-b">
                          <tr>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Type</th>
                            <th className="py-2 px-3">Reference</th>
                            <th className="py-2 px-3 text-right">Debit</th>
                            <th className="py-2 px-3 text-right">Credit</th>
                            <th className="py-2 px-3 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-[13px]">
                          {ledger.entries.map((e, idx) => (
                            <tr key={idx} className="hover:bg-muted/50 transition-colors">
                              <td className="py-2 px-3 text-muted-foreground">{format(new Date(e.date), 'dd MMM yyyy')}</td>
                              <td className="py-2 px-3">
                                <span className={`font-semibold ${typeColors[e.type]}`}>{typeLabels[e.type]}</span>
                              </td>
                              <td className="py-2 px-3 font-medium">{e.ref}</td>
                              <td className="py-2 px-3 text-right">{e.debit > 0 ? <span className="text-red-600">{fmt(e.debit)}</span> : '-'}</td>
                              <td className="py-2 px-3 text-right">{e.credit > 0 ? <span className="text-emerald-600">{fmt(e.credit)}</span> : '-'}</td>
                              <td className={`py-2 px-3 text-right font-semibold ${e.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(e.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card List */}
                    <div className="lg:hidden divide-y divide-border">
                      {ledger.entries.map((e, idx) => (
                        <div key={idx} className="p-4 space-y-2 hover:bg-muted/30 transition-colors">
                          <div className="flex justify-between items-start">
                            <span className="text-xs text-muted-foreground font-medium">{format(new Date(e.date), 'dd MMM yyyy')}</span>
                            <span className={`text-[10px] font-bold uppercase ${typeColors[e.type]}`}>{typeLabels[e.type]}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold">{e.ref}</span>
                            <span className={`text-sm font-bold ${e.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(e.balance)}</span>
                          </div>
                          <div className="flex gap-4 text-[11px]">
                            {e.debit > 0 && <span>Debit: <span className="text-red-600 font-medium">{fmt(e.debit)}</span></span>}
                            {e.credit > 0 && <span>Credit: <span className="text-emerald-600 font-medium">{fmt(e.credit)}</span></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
