import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { IndianRupee, Users, FileText, TrendingUp, ArrowUpRight, ArrowDownRight, AlertTriangle, Clock } from 'lucide-react';
import { useInvoice } from '../context/InvoiceContext';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subMonths, isSameMonth } from 'date-fns';

export default function Dashboard() {
  const { invoices, config } = useInvoice();

  const metrics = useMemo(() => {
    let totalRevenue = 0;
    const uniqueClients = new Set();
    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const lastMonth = subMonths(now, 1).getMonth();

    invoices.forEach(inv => {
      // Calculate invoice total
      const subtotal = inv.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
      const taxAmount = inv.items.reduce((sum, item) => sum + (item.quantity * item.rate * (item.gstPercent / 100)), 0);
      const total = subtotal + taxAmount;

      totalRevenue += total;
      uniqueClients.add(inv.clientDetails.name);

      const invDate = new Date(inv.date);
      if (invDate.getMonth() === currentMonth && invDate.getFullYear() === now.getFullYear()) {
        currentMonthRevenue += total;
      } else if (invDate.getMonth() === lastMonth && invDate.getFullYear() === subMonths(now, 1).getFullYear()) {
        lastMonthRevenue += total;
      }
    });

    const growth = lastMonthRevenue === 0 
      ? 100 
      : ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

    // Top clients logic
    const clientRevenue: Record<string, number> = {};
    invoices.forEach(inv => {
      const total = inv.items.reduce((s, i) => s + i.quantity * i.rate * (1 + i.gstPercent / 100), 0);
      clientRevenue[inv.clientDetails.name] = (clientRevenue[inv.clientDetails.name] || 0) + total;
    });

    const topClients = Object.entries(clientRevenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Simple Revenue Forecast (Average of last 3 months)
    const last3Months = [0, 1, 2].map(i => {
      const d = subMonths(now, i);
      return invoices.reduce((sum, inv) => {
        if (isSameMonth(new Date(inv.date), d)) {
          return sum + inv.items.reduce((s, item) => s + (item.quantity * item.rate * (1 + item.gstPercent / 100)), 0);
        }
        return sum;
      }, 0);
    });
    const avgMonthlyRevenue = last3Months.reduce((a, b) => a + b, 0) / 3;

    return {
      totalRevenue,
      totalInvoices: invoices.length,
      activeClients: uniqueClients.size,
      growth,
      currentMonthRevenue,
      topClients,
      forecast: avgMonthlyRevenue
    };
  }, [invoices]);

  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthName = format(monthDate, 'MMM');
      
      const monthRevenue = invoices.reduce((sum, inv) => {
        const invDate = new Date(inv.date);
        if (isSameMonth(invDate, monthDate)) {
          const subtotal = inv.items.reduce((s, item) => s + (item.quantity * item.rate), 0);
          const tax = inv.items.reduce((s, item) => s + (item.quantity * item.rate * (item.gstPercent / 100)), 0);
          return sum + subtotal + tax;
        }
        return sum;
      }, 0);

      data.push({
        name: monthName,
        revenue: monthRevenue
      });
    }
    return data;
  }, [invoices]);

  const recentInvoices = invoices.slice(0, 5);

  const unpaidInvoices = invoices.filter(inv => !inv.status || inv.status === 'draft' || inv.status === 'sent' || inv.status === 'partial' || inv.status === 'overdue');
  const totalOutstanding = unpaidInvoices.reduce((sum, inv) => {
    const total = inv.items.reduce((s, i) => s + i.quantity * i.rate * (1 + i.gstPercent / 100), 0);
    return sum + total - (inv.amountPaid || 0);
  }, 0);

  const lowStockItems = config.savedItems.filter(i => i.stock !== undefined && i.lowStockAlert !== undefined && i.stock <= i.lowStockAlert);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-2">Here is a summary of your business performance.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full">
              <IndianRupee className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices Issued</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-full">
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalInvoices}</div>
            <p className="text-xs text-muted-foreground mt-1">Total generated</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <div className="p-2 bg-orange-500/10 rounded-full">
              <Users className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeClients}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique businesses</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
            <div className={`p-2 rounded-full ${metrics.growth >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <TrendingUp className={`h-4 w-4 ${metrics.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {metrics.growth >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
              {Math.abs(metrics.growth).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Compared to last month</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              {invoices.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--foreground))'
                      }}
                      formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                  <TrendingUp className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-sm">Create an invoice to see analytics</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Top Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              {metrics.topClients.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.topClients}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {metrics.topClients.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${1 - index * 0.2})`} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">No data yet</p>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {metrics.topClients.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(var(--primary) / ${1 - i * 0.2})` }} />
                    <span className="font-medium truncate max-w-[120px]">{c.name}</span>
                  </div>
                  <span className="text-muted-foreground">₹{c.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl"><TrendingUp className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-primary/70">Revenue Forecast</p>
              <p className="text-xl font-bold">₹{metrics.forecast.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <p className="text-[10px] text-muted-foreground">Estimated next month revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl"><Users className="w-5 h-5 text-emerald-500" /></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-500/70">Customer Retention</p>
              <p className="text-xl font-bold">{metrics.activeClients > 0 ? 'High' : 'N/A'}</p>
              <p className="text-[10px] text-muted-foreground">Based on repeat business</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl"><IndianRupee className="h-5 w-5 text-amber-500" /></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-amber-500/70">Avg. Ticket Size</p>
              <p className="text-xl font-bold">₹{metrics.totalInvoices > 0 ? (metrics.totalRevenue / metrics.totalInvoices).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}</p>
              <p className="text-[10px] text-muted-foreground">Revenue per invoice</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {recentInvoices.length > 0 ? (
              <div className="space-y-4 pt-2">
                {recentInvoices.map(inv => {
                  const subtotal = inv.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
                  const taxAmount = inv.items.reduce((sum, item) => sum + (item.quantity * item.rate * (item.gstPercent / 100)), 0);
                  const total = subtotal + taxAmount;
                  
                  return (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 pr-4">
                        <p className="text-sm font-medium truncate text-foreground">{inv.clientDetails.name || 'Unnamed Client'}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(inv.date), 'dd MMM yyyy')}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-foreground">₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-primary font-medium">{inv.invoiceNumber}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
                <FileText className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(unpaidInvoices.length > 0 || lowStockItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unpaidInvoices.length > 0 && (
            <Link to="/history">
              <Card className="border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-full"><Clock className="w-4 h-4 text-amber-500" /></div>
                  <div>
                    <p className="text-sm font-bold text-amber-500">{unpaidInvoices.length} Unpaid Invoice{unpaidInvoices.length > 1 ? 's' : ''}</p>
                    <p className="text-xs text-amber-500/80">Outstanding: ₹{totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {lowStockItems.length > 0 && (
            <Link to="/items">
              <Card className="border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-red-500/20 rounded-full"><AlertTriangle className="w-4 h-4 text-red-500" /></div>
                  <div>
                    <p className="text-sm font-bold text-red-500">{lowStockItems.length} Low Stock Item{lowStockItems.length > 1 ? 's' : ''}</p>
                    <p className="text-xs text-red-500/80">{lowStockItems.map(i => i.name).join(', ')}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
