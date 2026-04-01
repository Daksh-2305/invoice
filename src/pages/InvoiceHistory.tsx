import { useState, useRef } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import { format } from 'date-fns';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Copy, Trash2, Eye, X, Download, Send, CheckCircle, Clock, AlertCircle, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InvoicePreview } from '../components/InvoicePreview';
import type { Invoice, InvoiceStatus } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { DownloadModal } from '../components/DownloadModal';
import { Share } from '@capacitor/share';

export default function InvoiceHistory() {
  const { invoices, deleteInvoice, updateInvoiceStatus } = useInvoice();
  const navigate = useNavigate();
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pdfInvoice, setPdfInvoice] = useState<Invoice | null>(null);
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [saveStatus, setSaveStatus] = useState<{isOpen: boolean, fileName: string, fileUri: string}>({
    isOpen: false,
    fileName: '',
    fileUri: ''
  });
  const printRef = useRef<HTMLDivElement>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareInvoiceData, setShareInvoiceData] = useState<Invoice | null>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  const handleDuplicate = (invoice: Invoice) => {
    const duplicate = {
      ...invoice,
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
    navigate('/create', { state: { templateInvoice: duplicate } });
  };

  const calculateTotal = (invoice: Invoice) => {
    const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const tax = invoice.items.reduce((sum, item) => sum + (item.quantity * item.rate * (item.gstPercent / 100)), 0);
    return subtotal + tax;
  };

  const downloadPDF = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    setPdfInvoice(invoice);
    // 600ms delay - enough for React DOM to hydrate on slow mobile devices
    await new Promise(resolve => setTimeout(resolve, 600));
    
    if (!printRef.current) {
      setDownloadingId(null);
      setPdfInvoice(null);
      return;
    }
    
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        logging: false,
        windowWidth: 794,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const fileName = `Invoice_${invoice.invoiceNumber}.pdf`;

      const info = await Device.getInfo();
      if (info.platform === 'android' || info.platform === 'ios') {
        const base64 = pdf.output('datauristring').split(',')[1];
        
        try {
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Documents,
          });
          
          setSaveStatus({
            isOpen: true,
            fileName: fileName,
            fileUri: savedFile.uri
          });
        } catch (fsErr: any) {
          // Fallback to Data directory if Documents fails (Scoped Storage restrictions on Android 11+)
          try {
            const fallbackFile = await Filesystem.writeFile({
              path: fileName,
              data: base64,
              directory: Directory.Cache,
            });
            setSaveStatus({
              isOpen: true,
              fileName: fileName,
              fileUri: fallbackFile.uri
            });
          } catch (fallbackErr: any) {
            alert('Could not save file to device storage: ' + (fallbackErr.message || String(fallbackErr)));
          }
        }
      } else {
        pdf.save(fileName);
      }
    } catch (error: unknown) {
      console.error('Failed to generate PDF', error);
      const msg = error instanceof Error ? error.message : String(error);
      alert('PDF Error: ' + msg);
    } finally {
      setDownloadingId(null);
      setPdfInvoice(null);
    }
  };

  const shareInvoice = async (invoice: Invoice) => {
    setSharingId(invoice.id);
    setShareInvoiceData(invoice);
    await new Promise(resolve => setTimeout(resolve, 600));
    if (!shareRef.current) { setSharingId(null); setShareInvoiceData(null); return; }
    try {
      const canvas = await html2canvas(shareRef.current, {
        scale: 2, useCORS: true, logging: false, windowWidth: 794, backgroundColor: '#ffffff',
      });
      const fileName = `Invoice_${invoice.invoiceNumber}.png`;
      const info = await Device.getInfo();
      if (info.platform === 'android' || info.platform === 'ios') {
        const base64 = canvas.toDataURL('image/png').split(',')[1];
        const savedFile = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
        await Share.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: `Invoice ${invoice.invoiceNumber} from ${invoice.businessDetails.name || 'BillSaathi'}`,
          url: savedFile.uri,
        });
      } else {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ title: `Invoice ${invoice.invoiceNumber}`, files: [file] });
          } else {
            alert("Sharing not supported on this browser. Try downloading instead.");
          }
        }, 'image/png');
      }
    } catch (e) {
      console.error('Share failed', e);
    } finally {
      setSharingId(null);
      setShareInvoiceData(null);
    }
  };

  const sendReminder = (inv: Invoice) => {
    const total = calculateTotal(inv);
    const paid = inv.amountPaid || 0;
    const due = total - paid;
    let text = `Hi ${inv.clientDetails.name || 'there'},\n\n`;
    text += `This is a friendly reminder that your invoice *${inv.invoiceNumber}* has an outstanding amount of *₹${due.toFixed(2)}*.\n\n`;
    text += `Invoice Date: ${inv.date}\nDue Date: ${inv.dueDate}\nTotal: ₹${total.toFixed(2)}\nPaid: ₹${paid.toFixed(2)}\n*Balance Due: ₹${due.toFixed(2)}*\n\n`;
    text += `Please make the payment at your earliest convenience. Thank you! 🙏`;
    const encoded = encodeURIComponent(text);
    let href = `https://wa.me/?text=${encoded}`;
    if (inv.clientDetails.phone) {
      let phone = inv.clientDetails.phone.replace(/\D/g, '');
      if (phone.length === 10) phone = '91' + phone;
      href = `https://wa.me/${phone}?text=${encoded}`;
    }
    window.open(href, '_blank');
  };

  const handleRecordPayment = () => {
    if (!paymentModal) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) { alert('Enter a valid amount'); return; }
    const total = calculateTotal(paymentModal);
    const newPaid = (paymentModal.amountPaid || 0) + amount;
    const status: InvoiceStatus = newPaid >= total ? 'paid' : 'partial';
    updateInvoiceStatus(paymentModal.id, status, newPaid);
    setPaymentModal(null);
    setPaymentAmount('');
  };

  const statusIcon = (status?: InvoiceStatus) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case 'partial': return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case 'overdue': return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      default: return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-emerald-100 text-emerald-700', partial: 'bg-amber-100 text-amber-700',
    overdue: 'bg-red-100 text-red-700',
  };

  const filtered = filterStatus === 'all' ? invoices : invoices.filter(i => (i.status || 'draft') === filterStatus);

  return (
    <div className="space-y-3 animate-in fade-in duration-500 pb-24">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Invoice History</h1>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </header>

      <DownloadModal 
        isOpen={saveStatus.isOpen} 
        onClose={() => setSaveStatus(prev => ({ ...prev, isOpen: false }))}
        fileName={saveStatus.fileName}
        fileUri={saveStatus.fileUri}
      />

      <div className="bg-card text-card-foreground rounded-lg border shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <h3 className="text-base font-medium text-foreground mb-1">No invoices yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Create your first invoice to see it here.</p>
            <Button onClick={() => navigate('/create')} size="sm">Create Invoice</Button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-secondary text-secondary-foreground text-[11px] uppercase font-medium border-b">
                <tr>
                  <th className="px-3 py-2.5">Invoice #</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Client</th>
                  <th className="px-3 py-2.5 text-right">Total</th>
                  <th className="px-3 py-2.5 text-right">Paid</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[13px]">
                {filtered.map((inv) => {
                  const total = calculateTotal(inv);
                  const paid = inv.amountPaid || 0;
                  const status = inv.status || 'draft';
                  return (
                    <tr key={inv.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-3 py-2 font-semibold text-primary cursor-pointer hover:underline" onClick={() => setViewingInvoice(inv)}>
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{format(new Date(inv.date), 'dd MMM yyyy')}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-[13px]">{inv.clientDetails.name || 'Unnamed'}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">₹{total.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right font-medium text-emerald-600">₹{paid.toFixed(0)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${statusColors[status]}`}>
                          {statusIcon(status as InvoiceStatus)} {status}
                        </span>
                      </td>
                      <td className="px-3 py-1">
                        <div className="flex justify-center gap-0.5">
                          <Button variant="ghost" size="icon" title="View" onClick={() => setViewingInvoice(inv)} className="h-7 w-7">
                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Share" onClick={() => shareInvoice(inv)} disabled={sharingId === inv.id} className="h-7 w-7">
                            <Share2 className={`w-3.5 h-3.5 ${sharingId === inv.id ? 'animate-pulse text-primary' : 'text-indigo-500'}`} />
                          </Button>
                          <Button variant="ghost" size="icon" title="Download PDF" onClick={() => downloadPDF(inv)} disabled={downloadingId === inv.id} className="h-7 w-7">
                            <Download className={`w-3.5 h-3.5 ${downloadingId === inv.id ? 'animate-pulse text-primary' : 'text-green-500'}`} />
                          </Button>
                          {status !== 'paid' && (
                            <>
                              <Button variant="ghost" size="icon" title="Record Payment" onClick={() => { setPaymentModal(inv); setPaymentAmount(''); }} className="h-7 w-7">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Send Reminder" onClick={() => sendReminder(inv)} className="h-7 w-7">
                                <Send className="w-3.5 h-3.5 text-amber-500" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" title="Duplicate" onClick={() => handleDuplicate(inv)} className="h-7 w-7">
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => { if (confirm('Delete?')) deleteInvoice(inv.id); }} className="h-7 w-7">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-border">
            {filtered.map((inv) => {
              const total = calculateTotal(inv);
              const paid = inv.amountPaid || 0;
              const status = inv.status || 'draft';
              return (
                <div key={inv.id} className="p-4 space-y-3 bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div onClick={() => setViewingInvoice(inv)} className="cursor-pointer">
                      <div className="text-sm font-bold text-primary">{inv.invoiceNumber}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(inv.date), 'dd MMM yyyy')}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[status]}`}>
                      {statusIcon(status as InvoiceStatus)} {status}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-[13px] font-semibold">{inv.clientDetails.name || 'Unnamed'}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Paid: <span className="text-emerald-600 font-medium">₹{paid.toFixed(0)}</span> / ₹{total.toFixed(0)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" onClick={() => shareInvoice(inv)} disabled={sharingId === inv.id} className="h-8 w-8 rounded-lg">
                        <Share2 className={`w-4 h-4 ${sharingId === inv.id ? 'animate-pulse text-primary' : 'text-indigo-500'}`} />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setViewingInvoice(inv)} className="h-8 w-8 rounded-lg">
                        <Eye className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => downloadPDF(inv)} disabled={downloadingId === inv.id} className="h-8 w-8 rounded-lg">
                        <Download className={`w-4 h-4 ${downloadingId === inv.id ? 'animate-pulse text-primary' : 'text-green-500'}`} />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => { if (confirm('Delete?')) deleteInvoice(inv.id); }} className="h-8 w-8 rounded-lg">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
        )}
      </div>

      {pdfInvoice && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '794px', zIndex: -10, opacity: 0.01, pointerEvents: 'none', backgroundColor: '#ffffff' }}>
          <InvoicePreview ref={printRef} invoice={pdfInvoice} />
        </div>
      )}
      {shareInvoiceData && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '794px', zIndex: -10, opacity: 0.01, pointerEvents: 'none', backgroundColor: '#ffffff' }}>
          <InvoicePreview ref={shareRef} invoice={shareInvoiceData} />
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-sm m-4 p-6 space-y-4">
            <h2 className="text-lg font-bold">Record Payment</h2>
            <p className="text-sm text-muted-foreground">Invoice: <strong>{paymentModal!.invoiceNumber}</strong></p>
            <p className="text-sm">Total: ₹{calculateTotal(paymentModal!).toFixed(2)} | Paid: ₹{(paymentModal!.amountPaid || 0).toFixed(2)}</p>
            <p className="text-sm font-bold text-primary">Balance: ₹{(calculateTotal(paymentModal!) - (paymentModal!.amountPaid || 0)).toFixed(2)}</p>
            <Input label="Payment Amount (₹)" type="number" min="0" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="Enter amount received" />
            <div className="flex gap-2">
              <Button onClick={handleRecordPayment}><CheckCircle className="w-4 h-4 mr-2" /> Record</Button>
              <Button variant="outline" onClick={() => setPaymentModal(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {viewingInvoice && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-4xl my-8 mx-4 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-background z-10">
              <h2 className="text-xl font-bold">Invoice: {viewingInvoice!.invoiceNumber}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadPDF(viewingInvoice!)} disabled={downloadingId === viewingInvoice!.id}>
                  <Download className={`w-4 h-4 mr-2 ${downloadingId === viewingInvoice!.id ? 'animate-pulse' : ''}`} />
                  {downloadingId === viewingInvoice!.id ? 'Generating...' : 'Download PDF'}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setViewingInvoice(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            {/* overflow-x-auto allows the fixed-width (794px) preview to scroll on small screens */}
            <div className="p-4 md:p-8 bg-muted/30 overflow-x-auto">
              <div className="shadow-2xl bg-white mx-auto" style={{ width: '794px' }}>
                <InvoicePreview invoice={viewingInvoice!} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
