import { useMemo, useState } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FileText, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { DownloadModal } from '../components/DownloadModal';
import { textToBase64, downloadWebFile } from '../lib/utils';

export default function GSTReport() {
  const { invoices, creditNotes } = useInvoice();

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(getLocalDateString(startOfMonth(new Date())));
  const [endDate, setEndDate] = useState(getLocalDateString(endOfMonth(new Date())));
  const [saveStatus, setSaveStatus] = useState({ isOpen: false, fileName: '', fileUri: '' });

  const filtered = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return invoices.filter(inv => {
      const d = new Date(inv.date);
      return isWithinInterval(d, { start, end });
    });
  }, [invoices, startDate, endDate]);

  const gstr1Data = useMemo(() => {
    const b2b: typeof filtered = [];
    const b2c: typeof filtered = [];
    let totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0, totalValue = 0;

    filtered.forEach(inv => {
      if (inv.clientDetails.gstin?.trim()) b2b.push(inv); else b2c.push(inv);

      inv.items.forEach(item => {
        const taxable = item.quantity * item.rate;
        const gst = taxable * (item.gstPercent / 100);
        totalTaxable += taxable;
        totalValue += taxable + gst;
        if (inv.taxType === 'IGST') {
          totalIGST += gst;
        } else {
          totalCGST += gst / 2;
          totalSGST += gst / 2;
        }
      });
    });

    return { b2b, b2c, totalTaxable, totalCGST, totalSGST, totalIGST, totalValue };
  }, [filtered]);

  const gstr3bData = useMemo(() => {
    const purchases = 0;
    const creditAmount = creditNotes.reduce((sum, cn) => {
      return sum + cn.items.reduce((s, i) => s + i.quantity * i.rate * (1 + i.gstPercent / 100), 0);
    }, 0);

    return {
      outwardTaxable: gstr1Data.totalTaxable,
      outputTax: gstr1Data.totalCGST + gstr1Data.totalSGST + gstr1Data.totalIGST,
      inputTax: purchases * 0.18,
      creditNoteAdjustment: creditAmount,
      netPayable: (gstr1Data.totalCGST + gstr1Data.totalSGST + gstr1Data.totalIGST) - (purchases * 0.18),
    };
  }, [gstr1Data, creditNotes]);

  const exportGSTR1CSV = async () => {
    let csv = 'Invoice No,Date,Client,GSTIN,Taxable Value,CGST,SGST,IGST,Total\n';
    filtered.forEach(inv => {
      const taxable = inv.items.reduce((s, i) => s + i.quantity * i.rate, 0);
      const gst = inv.items.reduce((s, i) => s + i.quantity * i.rate * (i.gstPercent / 100), 0);
      const cgst = inv.taxType === 'CGST_SGST' ? gst / 2 : 0;
      const sgst = inv.taxType === 'CGST_SGST' ? gst / 2 : 0;
      const igst = inv.taxType === 'IGST' ? gst : 0;
      csv += `"${inv.invoiceNumber}","${inv.date}","${inv.clientDetails.name}","${inv.clientDetails.gstin || ''}","${taxable.toFixed(2)}","${cgst.toFixed(2)}","${sgst.toFixed(2)}","${igst.toFixed(2)}","${(taxable + gst).toFixed(2)}"\n`;
    });

    const fileName = `GSTR1_${startDate}_to_${endDate}.csv`;
    const info = await Device.getInfo();
    
    if (info.platform === 'android' || info.platform === 'ios') {
      try {
        const base64Data = await textToBase64(csv, 'text/csv');
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
        });
        setSaveStatus({
          isOpen: true,
          fileName,
          fileUri: savedFile.uri
        });
      } catch {
        try {
          const base64Data = await textToBase64(csv, 'text/csv');
          const fallbackFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });
          setSaveStatus({
            isOpen: true,
            fileName,
            fileUri: fallbackFile.uri
          });
        } catch (fallbackErr) {
          alert('Could not save file to device storage: ' + (fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)));
        }
      }
    } else {
      downloadWebFile(csv, fileName, 'text/csv;charset=utf-8;');
    }
  };

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <DownloadModal 
        isOpen={saveStatus.isOpen} 
        onClose={() => setSaveStatus(prev => ({ ...prev, isOpen: false }))}
        fileName={saveStatus.fileName}
        fileUri={saveStatus.fileUri}
      />
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">GST Report Generator</h1>
          <p className="text-muted-foreground text-sm mt-1">Generate GSTR-1 and GSTR-3B summaries from your invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm" />
          <span className="text-muted-foreground text-sm">to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm" />
        </div>
      </header>

      {/* GSTR-1 Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> GSTR-1 Summary</CardTitle>
          <Button variant="outline" size="sm" onClick={exportGSTR1CSV}><Download className="w-3.5 h-3.5 mr-1" /> Export CSV</Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">B2B Invoices</p>
              <p className="text-lg font-bold">{gstr1Data.b2b.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">B2C Invoices</p>
              <p className="text-lg font-bold">{gstr1Data.b2c.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total Invoices</p>
              <p className="text-lg font-bold">{filtered.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-lg font-bold text-primary">{fmt(gstr1Data.totalValue)}</p>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-muted text-[11px] uppercase">
                <tr><th className="py-2 px-3 text-left">Particulars</th><th className="py-2 px-3 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y text-[13px]">
                <tr><td className="py-2 px-3 font-medium">Taxable Value</td><td className="py-2 px-3 text-right font-bold">{fmt(gstr1Data.totalTaxable)}</td></tr>
                <tr><td className="py-2 px-3">CGST</td><td className="py-2 px-3 text-right">{fmt(gstr1Data.totalCGST)}</td></tr>
                <tr><td className="py-2 px-3">SGST</td><td className="py-2 px-3 text-right">{fmt(gstr1Data.totalSGST)}</td></tr>
                <tr><td className="py-2 px-3">IGST</td><td className="py-2 px-3 text-right">{fmt(gstr1Data.totalIGST)}</td></tr>
                <tr className="font-bold bg-muted/30"><td className="py-2 px-3">Invoice Value</td><td className="py-2 px-3 text-right text-primary">{fmt(gstr1Data.totalValue)}</td></tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* GSTR-3B Summary */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-500" /> GSTR-3B Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-muted text-[11px] uppercase">
                <tr><th className="py-2 px-3 text-left">Section</th><th className="py-2 px-3 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y text-[13px]">
                <tr><td className="py-2 px-3">3.1(a) Outward Taxable Supplies</td><td className="py-2 px-3 text-right">{fmt(gstr3bData.outwardTaxable)}</td></tr>
                <tr><td className="py-2 px-3">3.1 Output Tax Liability</td><td className="py-2 px-3 text-right">{fmt(gstr3bData.outputTax)}</td></tr>
                <tr><td className="py-2 px-3">4. Input Tax Credit (ITC)</td><td className="py-2 px-3 text-right">{fmt(gstr3bData.inputTax)}</td></tr>
                <tr><td className="py-2 px-3">Credit Note Adjustments</td><td className="py-2 px-3 text-right text-destructive">-{fmt(gstr3bData.creditNoteAdjustment)}</td></tr>
                <tr className="font-bold bg-muted/30">
                  <td className="py-2 px-3 font-bold">Net Tax Payable</td>
                  <td className={`py-2 px-3 text-right font-extrabold ${gstr3bData.netPayable >= 0 ? 'text-primary' : 'text-emerald-600'}`}>{fmt(Math.max(0, gstr3bData.netPayable))}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">⚠️ This is an indicative summary for reference only. Always verify with your CA before filing.</p>
        </CardContent>
      </Card>

      {/* Invoice-level detail */}
      {filtered.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Invoice-wise Breakup ({filtered.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-muted text-[11px] uppercase border-b">
                  <tr>
                    <th className="py-2 px-3">Invoice #</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Client</th>
                    <th className="py-2 px-3">GSTIN</th>
                    <th className="py-2 px-3 text-right">Taxable</th>
                    <th className="py-2 px-3 text-right">Tax</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[13px]">
                  {filtered.map(inv => {
                    const taxable = inv.items.reduce((s, i) => s + i.quantity * i.rate, 0);
                    const tax = inv.items.reduce((s, i) => s + i.quantity * i.rate * (i.gstPercent / 100), 0);
                    return (
                      <tr key={inv.id} className="hover:bg-muted/50">
                        <td className="py-2 px-3 font-semibold text-primary">{inv.invoiceNumber}</td>
                        <td className="py-2 px-3 text-muted-foreground">{format(new Date(inv.date), 'dd MMM')}</td>
                        <td className="py-2 px-3">{inv.clientDetails.name}</td>
                        <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{inv.clientDetails.gstin || 'B2C'}</td>
                        <td className="py-2 px-3 text-right">{fmt(taxable)}</td>
                        <td className="py-2 px-3 text-right">{fmt(tax)}</td>
                        <td className="py-2 px-3 text-right font-semibold">{fmt(taxable + tax)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
