import { useState } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link as LinkIcon, Share2, Copy, Check, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { CURRENCY_SYMBOLS, type CurrencyCode } from '../types';
import { Share } from '@capacitor/share';
import { Device } from '@capacitor/device';

export default function SharedInvoice() {
  const { invoices, config } = useInvoice();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<string | null>(null);

  const currency = CURRENCY_SYMBOLS[(config.defaultCurrency || 'INR') as CurrencyCode] || '₹';

  const copyLink = (invoiceId: string) => {
    const url = `${window.location.origin}/#/invoice/${invoiceId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(invoiceId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const shareViaWhatsApp = async (inv: typeof invoices[0]) => {
    const total = inv.items.reduce((s, i) => s + i.quantity * i.rate * (1 + i.gstPercent / 100), 0);
    const url = `${window.location.origin}/#/invoice/${inv.id}`;
    const text = `Hi ${inv.clientDetails.name},\n\nHere is your invoice ${inv.invoiceNumber} for ${currency}${total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}.\n\nView & Pay online: ${url}\n\nThank you!\n${config.savedBusinessDetails?.name || 'BillSaathi'}`;
    
    const info = await Device.getInfo();
    if (info.platform === 'android' || info.platform === 'ios') {
      await Share.share({
        title: `Invoice ${inv.invoiceNumber}`,
        text: text,
        url: url,
        dialogTitle: 'Share Invoice Link',
      });
    } else {
      window.open(`https://wa.me/${inv.clientDetails.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`);
    }
  };



  const preview = previewInvoice ? invoices.find(i => i.id === previewInvoice) : null;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Online Invoice Links</h1>
        <p className="text-muted-foreground text-sm mt-1">Share beautiful invoice links with clients. They can view & pay instantly.</p>
      </header>

      {/* Preview Modal */}
      {preview && (
        <Card className="border-primary">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Invoice Preview — {preview.invoiceNumber}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setPreviewInvoice(null)}>Close</Button>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4 max-w-lg mx-auto">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{config.savedBusinessDetails?.name || 'Your Business'}</h2>
                  <p className="text-xs text-muted-foreground">{config.savedBusinessDetails?.address}</p>
                  {config.savedBusinessDetails?.gstin && <p className="text-xs font-mono text-muted-foreground">GSTIN: {config.savedBusinessDetails.gstin}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">{preview.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(preview.date), 'dd MMM yyyy')}</p>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">Bill To:</p>
                <p className="font-semibold">{preview.clientDetails.name}</p>
                <p className="text-xs text-muted-foreground">{preview.clientDetails.address}</p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-[11px] uppercase"><tr><th className="py-1.5 px-2 text-left">Item</th><th className="py-1.5 px-2 text-right">Qty</th><th className="py-1.5 px-2 text-right">Rate</th><th className="py-1.5 px-2 text-right">Amount</th></tr></thead>
                  <tbody className="divide-y text-[13px]">
                    {preview.items.map(item => (
                      <tr key={item.id}>
                        <td className="py-1.5 px-2">{item.name}</td>
                        <td className="py-1.5 px-2 text-right">{item.quantity}</td>
                        <td className="py-1.5 px-2 text-right">{currency}{item.rate}</td>
                        <td className="py-1.5 px-2 text-right font-medium">{currency}{(item.quantity * item.rate).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(() => {
                const subtotal = preview.items.reduce((s, i) => s + i.quantity * i.rate, 0);
                const tax = preview.items.reduce((s, i) => s + i.quantity * i.rate * (i.gstPercent / 100), 0);
                return (
                  <div className="text-right space-y-1">
                    <p className="text-sm">Subtotal: {currency}{subtotal.toLocaleString('en-IN')}</p>
                    <p className="text-sm">GST: {currency}{tax.toLocaleString('en-IN')}</p>
                    <p className="text-lg font-bold text-primary">Total: {currency}{(subtotal + tax).toLocaleString('en-IN')}</p>
                    {preview.amountPaid && preview.amountPaid > 0 && (
                      <p className="text-sm text-emerald-600">Paid: {currency}{preview.amountPaid.toLocaleString('en-IN')}</p>
                    )}
                  </div>
                );
              })()}

              {config.savedBusinessDetails?.upiId && (
                <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-sm font-semibold text-emerald-700">Pay via UPI</p>
                  <p className="text-xs font-mono text-emerald-600">{config.savedBusinessDetails.upiId}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice List */}
      <Card>
        <CardHeader><CardTitle className="text-base">All Invoices ({invoices.length})</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <LinkIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-foreground">No invoices yet</p>
              <p className="text-sm mt-1">Create an invoice first to share it.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => {
                const total = inv.items.reduce((s, i) => s + i.quantity * i.rate * (1 + i.gstPercent / 100), 0);
                const isCopied = copiedId === inv.id;
                return (
                  <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-primary">{inv.invoiceNumber}</p>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {(inv.status || 'draft').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm truncate">{inv.clientDetails.name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(inv.date), 'dd MMM yyyy')} · {currency}{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Preview" onClick={() => setPreviewInvoice(inv.id)}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy Link" onClick={() => copyLink(inv.id)}>
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="WhatsApp" onClick={() => shareViaWhatsApp(inv)}>
                        <Share2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
