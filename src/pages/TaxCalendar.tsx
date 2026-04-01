import { useMemo, useState } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { format, getDaysInMonth, startOfMonth, getDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Bell, CalendarDays } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface GSTDeadline {
  day: number;
  label: string;
  form: string;
  color: string;
}

const MONTHLY_DEADLINES: GSTDeadline[] = [
  { day: 11, label: 'GSTR-1 Due', form: 'GSTR-1', color: 'bg-blue-500' },
  { day: 13, label: 'GSTR-1 (QRMP) Due', form: 'IFF', color: 'bg-blue-400' },
  { day: 20, label: 'GSTR-3B Due', form: 'GSTR-3B', color: 'bg-red-500' },
  { day: 25, label: 'GST Payment Due', form: 'PMT-06', color: 'bg-amber-500' },
];

const ANNUAL_DEADLINES = [
  { month: 11, day: 31, label: 'GSTR-9 Annual Return', form: 'GSTR-9', color: 'bg-purple-500' },
  { month: 11, day: 31, label: 'GSTR-9C Reconciliation', form: 'GSTR-9C', color: 'bg-purple-400' },
  { month: 2, day: 31, label: 'GSTR-4 (Composition)', form: 'GSTR-4', color: 'bg-teal-500' },
];

export default function TaxCalendar() {
  const { invoices } = useInvoice();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfWeek = getDay(startOfMonth(currentMonth));
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  // Get deadlines for this month
  const deadlines = useMemo(() => {
    const list: Array<GSTDeadline & { date: Date; isPast: boolean }> = [];

    MONTHLY_DEADLINES.forEach(d => {
      const date = new Date(year, month, d.day);
      list.push({ ...d, date, isPast: date < today });
    });

    ANNUAL_DEADLINES.forEach(d => {
      if (d.month === month) {
        const date = new Date(year, month, d.day);
        list.push({ ...d, date, isPast: date < today });
      }
    });

    return list.sort((a, b) => a.day - b.day);
  }, [year, month]);

  // Revenue this month
  const monthRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      const d = new Date(inv.date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        return sum + inv.items.reduce((s, i) => s + i.quantity * i.rate * (1 + i.gstPercent / 100), 0);
      }
      return sum;
    }, 0);
  }, [invoices, month, year]);

  const monthTax = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      const d = new Date(inv.date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        return sum + inv.items.reduce((s, i) => s + i.quantity * i.rate * (i.gstPercent / 100), 0);
      }
      return sum;
    }, 0);
  }, [invoices, month, year]);

  const getDeadlinesForDay = (day: number) => deadlines.filter(d => d.day === day);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">GST Filing Calendar</h1>
        <p className="text-muted-foreground text-sm mt-1">Never miss a GST deadline. Visual calendar with all filing dates.</p>
      </header>

      {/* Month summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-primary/10 border">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Revenue This Month</p>
          <p className="text-lg font-bold text-primary">₹{monthRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="p-3 rounded-lg bg-red-50 border border-red-100">
          <p className="text-[10px] uppercase font-bold text-red-400">Estimated GST Liability</p>
          <p className="text-lg font-bold text-red-600">₹{monthTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
          <p className="text-[10px] uppercase font-bold text-amber-500">Upcoming Deadlines</p>
          <p className="text-lg font-bold text-amber-700">{deadlines.filter(d => !d.isPast).length}</p>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /> {format(currentMonth, 'MMMM yyyy')}</CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-xs">Today</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16 md:h-20 rounded-lg" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = isCurrentMonth && today.getDate() === day;
              const dayDeadlines = getDeadlinesForDay(day);
              const isPastDay = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

              return (
                <div key={day}
                  className={`h-16 md:h-20 rounded-lg p-1 border transition-colors ${isToday ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-transparent hover:bg-muted/50'} ${isPastDay && !isToday ? 'opacity-50' : ''}`}>
                  <div className={`text-xs font-medium mb-0.5 ${isToday ? 'text-primary font-bold' : ''}`}>{day}</div>
                  <div className="space-y-0.5">
                    {dayDeadlines.map((d, idx) => (
                      <div key={idx} className={`${d.color} text-white text-[8px] md:text-[9px] font-bold px-1 py-0.5 rounded truncate leading-tight`} title={d.label}>
                        {d.form}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Deadline List */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" /> Deadlines This Month</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {deadlines.map((d, idx) => (
              <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${d.isPast ? 'opacity-50 bg-muted/30' : 'bg-background'}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{d.label}</p>
                  <p className="text-xs text-muted-foreground">{format(d.date, 'EEEE, dd MMM yyyy')}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.isPast ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>
                  {d.isPast ? 'PAST' : 'UPCOMING'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
