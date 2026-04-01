import { useState } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import type { SavedItem } from '../types';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Plus, Trash2, Edit2, PackageOpen, AlertTriangle } from 'lucide-react';

export default function Items() {
  const { config, saveItem, deleteItem } = useInvoice();
  
  const [editingItem, setEditingItem] = useState<SavedItem | null>(null);

  const [formData, setFormData] = useState<Omit<SavedItem, 'id'>>({
    name: '', hsn: '', rate: 0, gstPercent: 18, stock: undefined, lowStockAlert: undefined,
  });

  const handleSave = () => {
    if (!formData.name.trim()) { alert("Name is required"); return; }
    saveItem({ id: editingItem ? editingItem.id : crypto.randomUUID(), ...formData });
    setEditingItem(null);
    setFormData({ name: '', hsn: '', rate: 0, gstPercent: 18, stock: undefined, lowStockAlert: undefined });
  };

  const handleEdit = (item: SavedItem) => {
    setEditingItem(item);
    setFormData({ name: item.name, hsn: item.hsn, rate: item.rate, gstPercent: item.gstPercent, stock: item.stock, lowStockAlert: item.lowStockAlert });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this item?")) {
      deleteItem(id);
      if (editingItem?.id === id) {
        setEditingItem(null);
        setFormData({ name: '', hsn: '', rate: 0, gstPercent: 18, stock: undefined, lowStockAlert: undefined });
      }
    }
  };

  const stockBadge = (item: SavedItem) => {
    if (item.stock === undefined || item.stock === null) return null;
    if (item.stock === 0) return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">OUT</span>;
    if (item.lowStockAlert && item.stock <= item.lowStockAlert) return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">LOW</span>;
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">OK</span>;
  };

  const lowStockItems = config.savedItems.filter(i => i.stock !== undefined && i.lowStockAlert && i.stock <= i.lowStockAlert);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Items & Inventory</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage products, services, and stock levels.</p>
      </header>

      {lowStockItems.length > 0 && (
        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Low Stock Alert</p>
            <p className="text-xs text-amber-700">{lowStockItems.map(i => `${i.name} (${i.stock} left)`).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <Card className="sticky top-6">
            <CardHeader><CardTitle className="text-base">{editingItem ? 'Edit Item' : 'Add New Item'}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input label="Item Name *" placeholder="Product ABC" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <Input label="HSN/SAC Code" placeholder="1234" value={formData.hsn} onChange={e => setFormData({...formData, hsn: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Rate (₹)" type="number" min="0" value={formData.rate} onChange={e => setFormData({...formData, rate: parseFloat(e.target.value) || 0})} />
                <div>
                  <label className="text-sm font-medium mb-1 block">GST %</label>
                  <select value={formData.gstPercent} onChange={e => setFormData({...formData, gstPercent: parseFloat(e.target.value)})}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Stock Qty" type="number" min="0" placeholder="Optional" value={formData.stock ?? ''} onChange={e => setFormData({...formData, stock: e.target.value === '' ? undefined : parseInt(e.target.value) || 0})} />
                <Input label="Low Stock Alert" type="number" min="0" placeholder="Optional" value={formData.lowStockAlert ?? ''} onChange={e => setFormData({...formData, lowStockAlert: e.target.value === '' ? undefined : parseInt(e.target.value) || 0})} />
              </div>
              <div className="pt-2 flex gap-2">
                <Button className="flex-1" size="sm" onClick={handleSave}>
                  <Plus className="w-4 h-4 mr-2" /> {editingItem ? 'Update Item' : 'Save Item'}
                </Button>
                {editingItem && (
                  <Button variant="outline" size="sm" onClick={() => { setEditingItem(null); setFormData({ name: '', hsn: '', rate: 0, gstPercent: 18, stock: undefined, lowStockAlert: undefined }); }}>Cancel</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Saved Items ({config.savedItems?.length || 0})</CardTitle></CardHeader>
            <CardContent>
              {config.savedItems && config.savedItems.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-[13px] text-left">
                    <thead className="bg-muted text-muted-foreground uppercase text-[11px]">
                      <tr>
                        <th className="py-2 px-3 font-medium">Item</th>
                        <th className="py-2 px-3 font-medium">HSN</th>
                        <th className="py-2 px-3 font-medium text-right">Rate</th>
                        <th className="py-2 px-3 font-medium text-right">GST</th>
                        <th className="py-2 px-3 font-medium text-center">Stock</th>
                        <th className="py-2 px-3 w-[100px] text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {config.savedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                          <td className="py-2 px-3 font-medium">{item.name}</td>
                          <td className="py-2 px-3 text-muted-foreground">{item.hsn || '-'}</td>
                          <td className="py-2 px-3 text-right">₹{item.rate.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">{item.gstPercent}%</td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="tabular-nums">{item.stock ?? '-'}</span>
                              {stockBadge(item)}
                            </div>
                          </td>
                          <td className="py-1 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleEdit(item)}><Edit2 className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <PackageOpen className="w-10 h-10 mb-3 text-muted-foreground/50" />
                  <p className="text-lg font-medium text-foreground">No items saved yet</p>
                  <p className="text-sm mt-1 max-w-sm">Save your products and services here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
