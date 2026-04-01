import { useState } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import type { PurchaseOrder, InvoiceItem } from '../types';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Plus, Trash2, ShoppingCart, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { formatPhoneNumber } from '../lib/utils';

export default function PurchaseOrders() {
  const { config, updateConfig, purchaseOrders, savePurchaseOrder, deletePurchaseOrder, adjustStock } = useInvoice();
  const [showForm, setShowForm] = useState(false);

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const emptyPO = (): PurchaseOrder => ({
    id: crypto.randomUUID(),
    poNumber: `PO-${String((config.lastPONumber || 0) + 1).padStart(4, '0')}`,
    date: getLocalDateString(new Date()),
    expectedDate: getLocalDateString(new Date(Date.now() + 7 * 86400000)),
    supplierName: '', supplierAddress: '', supplierPhone: '', supplierEmail: '', supplierGstin: '',
    items: [], notes: '', status: 'draft', taxType: 'CGST_SGST',
  });

  const [current, setCurrent] = useState<PurchaseOrder>(emptyPO);

  const addItem = () => {
    const item: InvoiceItem = { id: crypto.randomUUID(), name: '', hsn: '', quantity: 1, rate: 0, gstPercent: 18 };
    setCurrent(prev => ({ ...prev, items: [...prev.items, item] }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setCurrent(prev => ({ ...prev, items: prev.items.map(i => i.id === id ? { ...i, [field]: value } : i) }));
  };

  const removeItem = (id: string) => setCurrent(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));

  const handleSave = () => {
    if (!current.supplierName.trim()) { alert('Supplier name is required'); return; }
    savePurchaseOrder(current);
    updateConfig({ lastPONumber: (config.lastPONumber || 0) + 1 });
    setCurrent(emptyPO());
    setShowForm(false);
  };

  const handleMarkReceived = (po: PurchaseOrder) => {
    savePurchaseOrder({ ...po, status: 'received' });
    // Auto-adjust stock for matched items
    po.items.forEach(poItem => {
      const match = config.savedItems.find(si => si.name.toLowerCase() === poItem.name.toLowerCase());
      if (match && match.stock !== undefined) {
        adjustStock(match.id, poItem.quantity);
      }
    });
  };

  const calcTotal = (items: InvoiceItem[]) => items.reduce((s, i) => s + i.quantity * i.rate * (1 + i.gstPercent / 100), 0);

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
    received: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">Order from suppliers. Stock auto-updates when received.</p>
        </div>
        <Button size="sm" onClick={() => { setCurrent(emptyPO()); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New PO
        </Button>
      </header>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Purchase Order</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Supplier Name *" value={current.supplierName} onChange={e => setCurrent(prev => ({ ...prev, supplierName: e.target.value }))} placeholder="ABC Suppliers" />
              <Input label="Supplier Email" value={current.supplierEmail} onChange={e => setCurrent(prev => ({ ...prev, supplierEmail: e.target.value }))} placeholder="supplier@abc.com" />
              <Input label="Supplier Phone" value={current.supplierPhone} onChange={e => setCurrent(prev => ({ ...prev, supplierPhone: formatPhoneNumber(e.target.value) }))} placeholder="+91 98765 43210" />
              <Input label="Expected Delivery" type="date" value={current.expectedDate} onChange={e => setCurrent(prev => ({ ...prev, expectedDate: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Items to Order</h3>
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
              <Button onClick={handleSave}><ShoppingCart className="w-4 h-4 mr-2" /> Save PO</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">All Purchase Orders ({purchaseOrders.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {purchaseOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground p-4">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-foreground">No purchase orders</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-muted text-muted-foreground text-[11px] uppercase border-b">
                    <tr>
                      <th className="py-2 px-3">PO #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Supplier</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-[13px]">
                    {purchaseOrders.map(po => (
                      <tr key={po.id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-primary">{po.poNumber}</td>
                        <td className="py-2 px-3 text-muted-foreground">{format(new Date(po.date), 'dd MMM yyyy')}</td>
                        <td className="py-2 px-3">{po.supplierName}</td>
                        <td className="py-2 px-3 text-right font-medium">₹{calcTotal(po.items).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${statusColors[po.status]}`}>{po.status}</span>
                        </td>
                        <td className="py-1 px-3">
                          <div className="flex justify-center gap-0.5">
                            {po.status !== 'received' && po.status !== 'cancelled' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Mark as Received" onClick={() => handleMarkReceived(po)}>
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm('Delete?')) deletePurchaseOrder(po.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border">
                {purchaseOrders.map(po => (
                  <div key={po.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-bold text-primary">{po.poNumber}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(po.date), 'dd MMM yyyy')}</div>
                        <div className="text-[13px] font-medium mt-0.5">{po.supplierName}</div>
                        <div className="text-[12px] font-bold text-primary mt-0.5">₹{calcTotal(po.items).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[po.status]}`}>{po.status}</span>
                    </div>
                    <div className="flex gap-1">
                      {po.status !== 'received' && po.status !== 'cancelled' && (
                        <Button variant="outline" size="sm" onClick={() => handleMarkReceived(po)}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Mark Received
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => { if (confirm('Delete?')) deletePurchaseOrder(po.id); }}>
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

      <datalist id="saved-items">
        {config.savedItems?.map(i => <option key={i.id} value={i.name} />)}
      </datalist>
    </div>
  );
}
