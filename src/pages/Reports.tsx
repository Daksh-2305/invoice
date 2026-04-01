import { useMemo, useState } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, IndianRupee, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { subMonths, isSameMonth, format } from 'date-fns';

export default function Reports() {
  const { invoices, expenses } = useInvoice();
  const [months, setMonths] = useState(6);

  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthName = format(monthDate, 'MMM yy');

      const income = invoices.reduce((sum, inv) => {
        const invDate = new Date(inv.date);
        if (isSameMonth(invDate, monthDate)) {
          return sum + inv.items.reduce((s, item) => s + item.quantity * item.rate * (1 + item.gstPercent / 100), 0);
        }
        return sum;
      }, 0);

      const expense = expenses.reduce((sum, exp) => {
        const expDate = new Date(exp.date);
        if (isSameMonth(expDate, monthDate)) {
          return sum + exp.amount;
        }
        return sum;
      }, 0);

      data.push({ name: monthName, income: Math.round(income), expenses: Math.round(expense), profit: Math.round(income - expense) });
    }
    return data;
  }, [invoices, expenses, months]);

  const totals = useMemo(() => {
    const totalIncome = chartData.reduce((s, d) => s + d.income, 0);
    const totalExpenses = chartData.reduce((s, d) => s + d.expenses, 0);
    return { totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses };
  }, [chartData]);

  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach(e => {
      cats[e.category] = (cats[e.category] || 0) + e.amount;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profit & Loss Report</h1>
          <p className="text-muted-foreground text-sm mt-1">Revenue vs Expenses breakdown.</p>
        </div>
        <select value={months} onChange={e => setMonths(Number(e.target.value))}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm">
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-full"><TrendingUp className="h-4 w-4 text-emerald-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">₹{totals.totalIncome.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">From {invoices.length} invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <div className="p-2 bg-red-500/10 rounded-full"><TrendingDown className="h-4 w-4 text-red-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">₹{totals.totalExpenses.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {expenses.length} entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <div className={`p-2 rounded-full ${totals.netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <IndianRupee className={`h-4 w-4 ${totals.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-1 ${totals.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {totals.netProfit >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
              ₹{Math.abs(totals.netProfit).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{totals.netProfit >= 0 ? 'Profit' : 'Loss'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Monthly Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {chartData.some(d => d.income > 0 || d.expenses > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                    formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, '']} />
                  <Legend />
                  <Bar dataKey="income" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                <p className="text-sm">Add invoices and expenses to see the report</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Expense by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoryBreakdown.map(([cat, amount]) => {
                const pct = totals.totalExpenses > 0 ? (amount / totals.totalExpenses) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{cat}</span>
                      <span className="text-muted-foreground">₹{amount.toLocaleString('en-IN')} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
