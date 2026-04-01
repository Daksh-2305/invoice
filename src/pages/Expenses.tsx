import { useState } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import type { Expense, ExpenseCategory } from '../types';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Plus, Trash2, Wallet, Filter } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES: ExpenseCategory[] = ['Rent', 'Supplies', 'Travel', 'Utilities', 'Salary', 'Marketing', 'Software', 'Food', 'Other'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Other'] as const;

const categoryColors: Record<string, string> = {
  Rent: 'bg-blue-100 text-blue-700', Supplies: 'bg-amber-100 text-amber-700', Travel: 'bg-emerald-100 text-emerald-700',
  Utilities: 'bg-violet-100 text-violet-700', Salary: 'bg-rose-100 text-rose-700', Marketing: 'bg-orange-100 text-orange-700',
  Software: 'bg-cyan-100 text-cyan-700', Food: 'bg-pink-100 text-pink-700', Other: 'bg-slate-100 text-slate-600',
};

export default function Expenses() {
  const { expenses, saveExpense, deleteExpense } = useInvoice();
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
    date: getLocalDateString(new Date()),
    category: 'Other',
    amount: 0,
    description: '',
    paymentMethod: 'UPI',
  });

  const handleSave = () => {
    if (!formData.description.trim()) { alert('Description is required'); return; }
    if (formData.amount <= 0) { alert('Amount must be greater than 0'); return; }
    saveExpense({ id: crypto.randomUUID(), ...formData });
    setFormData({ date: getLocalDateString(new Date()), category: 'Other', amount: 0, description: '', paymentMethod: 'UPI' });
    setShowForm(false);
  };

  const filtered = filterCategory === 'all' ? expenses : expenses.filter(e => e.category === filterCategory);
  const totalExpenses = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Tracker</h1>
          <p className="text-muted-foreground text-sm mt-1">Log and categorize all your business expenses.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" /> Add Expense</Button>
      </header>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Expense</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Description *" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Office rent, travel, etc." />
              <Input label="Amount (₹) *" type="number" min="0" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} placeholder="5000" />
              <Input label="Date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground/90">Category</label>
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground/90">Payment Method</label>
                <select value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}><Wallet className="w-4 h-4 mr-2" /> Save Expense</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm">
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="ml-auto text-sm font-bold">
          Total: <span className="text-primary">₹{totalExpenses.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-foreground">No expenses recorded</p>
              <p className="text-sm mt-1">Start tracking your business expenses.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground text-[11px] uppercase border-b">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Payment</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3 w-[60px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[13px]">
                  {filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                    <tr key={exp.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-2 px-3 text-muted-foreground">{format(new Date(exp.date), 'dd MMM yyyy')}</td>
                      <td className="py-2 px-3 font-medium">{exp.description}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${categoryColors[exp.category]}`}>{exp.category}</span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{exp.paymentMethod}</td>
                      <td className="py-2 px-3 text-right font-semibold text-destructive">-₹{exp.amount.toLocaleString('en-IN')}</td>
                      <td className="py-1 px-3">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                          if (confirm('Delete this expense?')) deleteExpense(exp.id);
                        }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
