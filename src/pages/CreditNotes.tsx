import { useState } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import type { CreditNote, InvoiceItem } from '../types';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Plus, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function CreditNotes() {
  const { config, updateConfig, invoices, creditNotes, saveCreditNote, deleteCreditNote } = useInvoice();
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState<{ items: InvoiceItem[]; reason: string }>({ items: [], reason: '' });

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    const inv = invoices.find(i => i.id === invoiceId);
    if (inv) setFormData({ items: inv.items.map(item => ({ ...item, id: crypto.randomUUID() })), reason: '' });
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setFormData(prev => ({ ...prev, items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item) }));
  };

  const removeItem = (id: string) => setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));

  const calcTotal = (items: InvoiceItem[]) => items.reduce((s, i) => s + i.quantity * i.rate * (1 + i.gstPercent / 100), 0);

  const handleSave = () => {
    const inv = invoices.find(i => i.id === selectedInvoiceId);
    if (!inv) { alert('Please select an invoice'); return; }
    if (!formData.reason.trim()) { alert('Reason is required'); return; }
    const cn: CreditNote = {
      id: crypto.randomUUID(),
      creditNoteNumber: `CN-${String((config.lastCreditNoteNumber || 0) + 1).padStart(4, '0')}`,
      date: getLocalDateString(new Date()),
      linkedInvoiceId: inv.id,
      linkedInvoiceNumber: inv.invoiceNumber,
      businessDetails: inv.businessDetails,
      clientDetails: inv.clientDetails,
      items: formData.items,
      reason: formData.reason,
      taxType: inv.taxType,
    };
    saveCreditNote(cn);
    updateConfig({ lastCreditNoteNumber: (config.lastCreditNoteNumber || 0) + 1 });
    setFormData({ items: [], reason: '' });
    setSelectedInvoiceId('');
    setShowForm(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Credit Notes</h1>
          <p className="text-muted-foreground text-sm mt-1">Issue returns and adjustments against invoices.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" /> New Credit Note</Button>
      </header>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Credit Note</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Invoice *</label>
              <select value={selectedInvoiceId} onChange={e => handleSelectInvoice(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">-- Choose an invoice --</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.clientDetails.name} (₹{calcTotal(inv.items).toFixed(0)})</option>
                ))}
              </select>
            </div>
            {formData.items.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Items to Credit</h3>
                {formData.items.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-lg bg-muted/30">
                    <div className="col-span-4"><Input label={idx === 0 ? 'Name' : ''} value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} /></div>
                    <div className="col-span-2"><Input label={idx === 0 ? 'Qty' : ''} type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} /></div>
                    <div className="col-span-2"><Input label={idx === 0 ? 'Rate' : ''} type="number" value={item.rate} onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} /></div>
                    <div className="col-span-2"><Input label={idx === 0 ? 'GST%' : ''} type="number" value={item.gstPercent} onChange={e => updateItem(item.id, 'gstPercent', parseFloat(e.target.value) || 0)} /></div>
                    <div className="col-span-2 flex justify-end">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
                <div className="text-right font-bold text-primary">Credit Amount: ₹{calcTotal(formData.items).toFixed(2)}</div>
              </div>
            )}
            <Textarea label="Reason *" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder="Goods returned / Service not delivered / Pricing error" className="min-h-[60px]" />
            <div className="flex gap-2">
              <Button onClick={handleSave}><FileText className="w-4 h-4 mr-2" /> Issue Credit Note</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">All Credit Notes ({creditNotes.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {creditNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground p-4">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-foreground">No credit notes issued</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-muted text-muted-foreground text-[11px] uppercase border-b">
                    <tr>
                      <th className="py-2 px-3">CN #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Against Invoice</th>
                      <th className="py-2 px-3">Client</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3 w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-[13px]">
                    {creditNotes.map(cn => (
                      <tr key={cn.id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-primary">{cn.creditNoteNumber}</td>
                        <td className="py-2 px-3 text-muted-foreground">{format(new Date(cn.date), 'dd MMM yyyy')}</td>
                        <td className="py-2 px-3">{cn.linkedInvoiceNumber}</td>
                        <td className="py-2 px-3">{cn.clientDetails.name}</td>
                        <td className="py-2 px-3 text-right font-semibold text-destructive">-₹{calcTotal(cn.items).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="py-1 px-3">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm('Delete?')) deleteCreditNote(cn.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-border">
                {creditNotes.map(cn => (
                  <div key={cn.id} className="p-4 flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-primary">{cn.creditNoteNumber}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(cn.date), 'dd MMM yyyy')} · vs {cn.linkedInvoiceNumber}</div>
                      <div className="text-[13px] font-medium mt-0.5">{cn.clientDetails.name}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm font-bold text-destructive">-₹{calcTotal(cn.items).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => { if (confirm('Delete?')) deleteCreditNote(cn.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
