import { useState } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import type { RecurringTemplate, InvoiceItem } from '../types';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Plus, Trash2, RefreshCw, Play, Pause, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatPhoneNumber } from '../lib/utils';

export default function RecurringInvoices() {
  const { config, recurringTemplates, saveRecurringTemplate, deleteRecurringTemplate } = useInvoice();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const emptyTemplate = (): RecurringTemplate => ({
    id: crypto.randomUUID(),
    name: '',
    frequency: 'monthly',
    clientDetails: { name: '', address: '', gstin: '', email: '', phone: '' },
    items: [],
    notes: '',
    terms: '',
    taxType: 'CGST_SGST',
    nextDueDate: getLocalDateString(new Date()),
    isActive: true,
  });

  const [current, setCurrent] = useState<RecurringTemplate>(emptyTemplate);

  const addItem = () => {
    const item: InvoiceItem = { id: crypto.randomUUID(), name: '', hsn: '', quantity: 1, rate: 0, gstPercent: 18 };
    setCurrent(prev => ({ ...prev, items: [...prev.items, item] }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setCurrent(prev => ({ ...prev, items: prev.items.map(i => i.id === id ? { ...i, [field]: value } : i) }));
  };

  const removeItem = (id: string) => setCurrent(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));

  const handleSave = () => {
    if (!current.name.trim()) { alert('Template name is required'); return; }
    if (!current.clientDetails.name.trim()) { alert('Client name is required'); return; }
    saveRecurringTemplate(current);
    setCurrent(emptyTemplate());
    setShowForm(false);
  };

  const handleGenerate = (template: RecurringTemplate) => {
    navigate('/create', {
      state: {
        templateInvoice: {
          id: crypto.randomUUID(),
          invoiceNumber: `INV-${String(config.lastInvoiceNumber + 1).padStart(4, '0')}`,
          date: getLocalDateString(new Date()),
          dueDate: getLocalDateString(new Date(Date.now() + 7 * 86400000)),
          businessDetails: config.savedBusinessDetails || { name: '', address: '', gstin: '', email: '', phone: '' },
          clientDetails: template.clientDetails,
          items: template.items.map(i => ({ ...i, id: crypto.randomUUID() })),
          notes: template.notes,
          terms: template.terms || 'Please pay within 7 days.',
          taxType: template.taxType,
          status: 'draft',
          amountPaid: 0,
        },
      },
    });
  };

  const toggleActive = (t: RecurringTemplate) => {
    saveRecurringTemplate({ ...t, isActive: !t.isActive });
  };

  const calcTotal = (items: InvoiceItem[]) => items.reduce((s, i) => s + i.quantity * i.rate * (1 + i.gstPercent / 100), 0);

  const freqLabels: Record<string, string> = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recurring Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">Set up templates for repeated billing.</p>
        </div>
        <Button size="sm" onClick={() => { setCurrent(emptyTemplate()); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </header>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Recurring Template</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Template Name *" value={current.name} onChange={e => setCurrent(prev => ({ ...prev, name: e.target.value }))} placeholder="Monthly Retainer — Client X" />
              <div>
                <label className="block text-sm font-medium mb-1">Frequency</label>
                <select value={current.frequency} onChange={e => setCurrent(prev => ({ ...prev, frequency: e.target.value as any }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <Input label="Client Name *" value={current.clientDetails.name}
                list="saved-clients"
                onChange={e => {
                  const val = e.target.value;
                  const match = config.savedClients?.find(c => c.name === val);
                  if (match) {
                    setCurrent(prev => ({ ...prev, clientDetails: { name: match.name, email: match.email, phone: match.phone, gstin: match.gstin, address: match.address } }));
                  } else {
                    setCurrent(prev => ({ ...prev, clientDetails: { ...prev.clientDetails, name: val } }));
                  }
                }}
                placeholder="Client Corp" />
              <Input label="Client Phone" value={current.clientDetails.phone}
                onChange={e => setCurrent(prev => ({ ...prev, clientDetails: { ...prev.clientDetails, phone: formatPhoneNumber(e.target.value) } }))}
                placeholder="+91 98765 43210" />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Items</h3>
              {current.items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-lg bg-muted/30">
                  <div className="col-span-4"><Input label={idx === 0 ? 'Name' : ''} value={item.name} list="saved-items" onChange={e => updateItem(item.id, 'name', e.target.value)} /></div>
                  <div className="col-span-2"><Input label={idx === 0 ? 'Qty' : ''} type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} /></div>
                  <div className="col-span-2"><Input label={idx === 0 ? 'Rate' : ''} type="number" value={item.rate} onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} /></div>
                  <div className="col-span-2"><Input label={idx === 0 ? 'GST%' : ''} type="number" value={item.gstPercent} onChange={e => updateItem(item.id, 'gstPercent', parseFloat(e.target.value) || 0)} /></div>
                  <div className="col-span-2 flex justify-end">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
            </div>

            <Textarea label="Notes" value={current.notes} onChange={e => setCurrent(prev => ({ ...prev, notes: e.target.value }))} className="min-h-[60px]" />

            <div className="flex gap-2">
              <Button onClick={handleSave}><RefreshCw className="w-4 h-4 mr-2" /> Save Template</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Templates ({recurringTemplates.length})</CardTitle></CardHeader>
        <CardContent>
          {recurringTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-foreground">No recurring templates</p>
              <p className="text-sm mt-1">Set up templates for repeated invoicing.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recurringTemplates.map(t => (
                <div key={t.id} className={`p-3 border rounded-lg flex items-center justify-between gap-4 transition-colors ${t.isActive ? 'border-primary/20 bg-primary/5' : 'opacity-60'}`}>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{t.name}</div>
                    <div className="text-sm text-muted-foreground">{t.clientDetails.name} · {freqLabels[t.frequency]} · ₹{calcTotal(t.items).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Generate Invoice" onClick={() => handleGenerate(t)}>
                      <ArrowRight className="w-4 h-4 text-emerald-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title={t.isActive ? 'Pause' : 'Activate'} onClick={() => toggleActive(t)}>
                      {t.isActive ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => {
                      if (confirm('Delete this template?')) deleteRecurringTemplate(t.id);
                    }}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <datalist id="saved-clients">
        {config.savedClients?.map(c => <option key={c.id} value={c.name} />)}
      </datalist>
      <datalist id="saved-items">
        {config.savedItems?.map(i => <option key={i.id} value={i.name} />)}
      </datalist>
    </div>
  );
}
