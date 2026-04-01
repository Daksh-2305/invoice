import { useState } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import type { DeliveryChallan, InvoiceItem } from '../types';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Plus, Trash2, Truck, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { formatPhoneNumber } from '../lib/utils';

export default function DeliveryChallans() {
  const { config, updateConfig, challans, saveChallan, deleteChallan } = useInvoice();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const emptyChallan = (): DeliveryChallan => ({
    id: crypto.randomUUID(),
    challanNumber: `DC-${String((config.lastChallanNumber || 0) + 1).padStart(4, '0')}`,
    date: getLocalDateString(new Date()),
    businessDetails: config.savedBusinessDetails || { name: '', address: '', gstin: '', email: '', phone: '' },
    clientDetails: { name: '', address: '', gstin: '', email: '', phone: '' },
    items: [],
    vehicleNumber: '',
    transportMode: 'Road',
    notes: '',
    status: 'draft',
  });

  const [current, setCurrent] = useState<DeliveryChallan>(emptyChallan);

  const addItem = () => {
    const item: InvoiceItem = { id: crypto.randomUUID(), name: '', hsn: '', quantity: 1, rate: 0, gstPercent: 18 };
    setCurrent(prev => ({ ...prev, items: [...prev.items, item] }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setCurrent(prev => ({ ...prev, items: prev.items.map(i => i.id === id ? { ...i, [field]: value } : i) }));
  };

  const removeItem = (id: string) => setCurrent(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));

  const handleSave = () => {
    if (!current.clientDetails.name.trim()) { alert('Client name is required'); return; }
    saveChallan(current);
    updateConfig({ lastChallanNumber: (config.lastChallanNumber || 0) + 1 });
    setCurrent(emptyChallan());
    setShowForm(false);
  };

  const handleMarkDelivered = (ch: DeliveryChallan) => {
    saveChallan({ ...ch, status: 'delivered' });
  };

  const handleConvertToInvoice = (ch: DeliveryChallan) => {
    saveChallan({ ...ch, status: 'converted' });
    navigate('/create', {
      state: {
        templateInvoice: {
          id: crypto.randomUUID(),
          invoiceNumber: `INV-${String(config.lastInvoiceNumber + 1).padStart(4, '0')}`,
          date: getLocalDateString(new Date()),
          dueDate: getLocalDateString(new Date(Date.now() + 7 * 86400000)),
          businessDetails: ch.businessDetails,
          clientDetails: ch.clientDetails,
          items: ch.items,
          notes: `Against Delivery Challan ${ch.challanNumber}`,
          terms: 'Please pay within 7 days.',
          taxType: 'CGST_SGST' as const,
          status: 'draft' as const,
          amountPaid: 0,
        },
      },
    });
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600', delivered: 'bg-emerald-100 text-emerald-700', converted: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delivery Challans</h1>
          <p className="text-muted-foreground text-sm mt-1">Track goods dispatched and convert to invoices later.</p>
        </div>
        <Button size="sm" onClick={() => { setCurrent(emptyChallan()); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Challan
        </Button>
      </header>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Delivery Challan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Client Name *" value={current.clientDetails.name} list="saved-clients"
                onChange={e => {
                  const val = e.target.value;
                  const match = config.savedClients?.find(c => c.name === val);
                  if (match) setCurrent(prev => ({ ...prev, clientDetails: { name: match.name, email: match.email, phone: match.phone, gstin: match.gstin, address: match.address } }));
                  else setCurrent(prev => ({ ...prev, clientDetails: { ...prev.clientDetails, name: val } }));
                }} />
              <Input label="Client Phone" value={current.clientDetails.phone}
                onChange={e => setCurrent(prev => ({ ...prev, clientDetails: { ...prev.clientDetails, phone: formatPhoneNumber(e.target.value) } }))} />
              <Input label="Vehicle Number" value={current.vehicleNumber} placeholder="MH 12 AB 1234"
                onChange={e => setCurrent(prev => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))} />
              <div>
                <label className="block text-sm font-medium mb-1">Transport Mode</label>
                <select value={current.transportMode} onChange={e => setCurrent(prev => ({ ...prev, transportMode: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option>Road</option><option>Rail</option><option>Air</option><option>Courier</option><option>Hand Delivery</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Items</h3>
              {current.items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-lg bg-muted/30">
                  <div className="col-span-5"><Input label={idx === 0 ? 'Name' : ''} value={item.name} list="saved-items" onChange={e => updateItem(item.id, 'name', e.target.value)} /></div>
                  <div className="col-span-3"><Input label={idx === 0 ? 'Qty' : ''} type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} /></div>
                  <div className="col-span-2"><Input label={idx === 0 ? 'Rate' : ''} type="number" value={item.rate} onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} /></div>
                  <div className="col-span-2 flex justify-end">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
            </div>

            <Textarea label="Notes" value={current.notes} onChange={e => setCurrent(prev => ({ ...prev, notes: e.target.value }))} className="min-h-[60px]" />

            <div className="flex gap-2">
              <Button onClick={handleSave}><Truck className="w-4 h-4 mr-2" /> Save Challan</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">All Challans ({challans.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {challans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground p-4">
              <Truck className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-foreground">No delivery challans</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-muted text-muted-foreground text-[11px] uppercase border-b">
                    <tr>
                      <th className="py-2 px-3">DC #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Client</th>
                      <th className="py-2 px-3">Vehicle</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-[13px]">
                    {challans.map(ch => (
                      <tr key={ch.id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-primary">{ch.challanNumber}</td>
                        <td className="py-2 px-3 text-muted-foreground">{format(new Date(ch.date), 'dd MMM yyyy')}</td>
                        <td className="py-2 px-3">{ch.clientDetails.name}</td>
                        <td className="py-2 px-3 font-mono text-xs">{ch.vehicleNumber || '-'}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${statusColors[ch.status]}`}>{ch.status}</span>
                        </td>
                        <td className="py-1 px-3">
                          <div className="flex justify-center gap-0.5">
                            {ch.status === 'draft' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Mark Delivered" onClick={() => handleMarkDelivered(ch)}>
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              </Button>
                            )}
                            {ch.status !== 'converted' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Convert to Invoice" onClick={() => handleConvertToInvoice(ch)}>
                                <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm('Delete?')) deleteChallan(ch.id); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border">
                {challans.map(ch => (
                  <div key={ch.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-bold text-primary">{ch.challanNumber}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(ch.date), 'dd MMM yyyy')}</div>
                        <div className="text-[13px] font-medium mt-0.5">{ch.clientDetails.name}</div>
                        {ch.vehicleNumber && <div className="text-xs font-mono text-muted-foreground">{ch.vehicleNumber}</div>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[ch.status]}`}>{ch.status}</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {ch.status === 'draft' && (
                        <Button variant="outline" size="sm" onClick={() => handleMarkDelivered(ch)}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Delivered
                        </Button>
                      )}
                      {ch.status !== 'converted' && (
                        <Button variant="outline" size="sm" onClick={() => handleConvertToInvoice(ch)}>
                          <ArrowRight className="w-3.5 h-3.5 mr-1 text-blue-500" /> Invoice
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => { if (confirm('Delete?')) deleteChallan(ch.id); }}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <datalist id="saved-clients">{config.savedClients?.map(c => <option key={c.id} value={c.name} />)}</datalist>
      <datalist id="saved-items">{config.savedItems?.map(i => <option key={i.id} value={i.name} />)}</datalist>
    </div>
  );
}
