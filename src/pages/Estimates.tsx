import { useState, useRef } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import type { Estimate, InvoiceItem } from '../types';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { FileText, Plus, Trash2, Eye, X, ArrowRight, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { formatPhoneNumber } from '../lib/utils';
import { InvoicePreview } from '../components/InvoicePreview';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { DownloadModal } from '../components/DownloadModal';

export default function Estimates() {
  const { config, updateConfig, estimates, saveEstimate, deleteEstimate } = useInvoice();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [pdfEstimate, setPdfEstimate] = useState<Estimate | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{isOpen: boolean, fileName: string, fileUri: string}>({
    isOpen: false,
    fileName: '',
    fileUri: ''
  });

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [showForm, setShowForm] = useState(false);
  const [viewingEstimate, setViewingEstimate] = useState<Estimate | null>(null);

  const emptyEstimate = (): Estimate => ({
    id: crypto.randomUUID(),
    estimateNumber: `EST-${String((config.lastEstimateNumber || 0) + 1).padStart(4, '0')}`,
    date: getLocalDateString(new Date()),
    validUntil: getLocalDateString(new Date(Date.now() + 15 * 86400000)),
    businessDetails: config.savedBusinessDetails || { name: '', address: '', gstin: '', email: '', phone: '' },
    clientDetails: { name: '', address: '', gstin: '', email: '', phone: '' },
    items: [],
    notes: '',
    terms: 'This estimate is valid for 15 days.',
    taxType: 'CGST_SGST',
    status: 'draft',
  });

  const [currentEstimate, setCurrentEstimate] = useState<Estimate>(emptyEstimate);

  const addItem = () => {
    const newItem: InvoiceItem = { id: crypto.randomUUID(), name: '', hsn: '', quantity: 1, rate: 0, gstPercent: 18 };
    setCurrentEstimate(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setCurrentEstimate(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeItem = (id: string) => {
    setCurrentEstimate(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  const handleSave = () => {
    if (!currentEstimate.clientDetails.name.trim()) {
      alert('Client name is required');
      return;
    }
    saveEstimate(currentEstimate);
    updateConfig({ lastEstimateNumber: (config.lastEstimateNumber || 0) + 1 });
    setCurrentEstimate(emptyEstimate());
    setShowForm(false);
  };

  const handleConvertToInvoice = (est: Estimate) => {
    saveEstimate({ ...est, status: 'converted' });
    navigate('/create', {
      state: {
        templateInvoice: {
          id: crypto.randomUUID(),
          invoiceNumber: `INV-${String(config.lastInvoiceNumber + 1).padStart(4, '0')}`,
          date: getLocalDateString(new Date()),
          dueDate: getLocalDateString(new Date(Date.now() + 7 * 86400000)),
          businessDetails: est.businessDetails,
          clientDetails: est.clientDetails,
          items: est.items,
          notes: est.notes,
          terms: 'Please pay within 7 days.',
          taxType: est.taxType,
          status: 'draft',
          amountPaid: 0,
        },
      },
    });
  };

  const calcTotal = (est: Estimate) => {
    const subtotal = est.items.reduce((s, i) => s + i.quantity * i.rate, 0);
    const tax = est.items.reduce((s, i) => s + i.quantity * i.rate * (i.gstPercent / 100), 0);
    return subtotal + tax;
  };

  // Convert an Estimate to a fake invoice shape for InvoicePreview
  const estimateAsInvoice = (est: Estimate) => ({
    id: est.id,
    invoiceNumber: est.estimateNumber,
    date: est.date,
    dueDate: est.validUntil,
    businessDetails: est.businessDetails,
    clientDetails: est.clientDetails,
    items: est.items,
    notes: est.notes,
    terms: est.terms,
    taxType: est.taxType,
    status: 'draft' as const,
    amountPaid: 0,
  });

  const downloadPDF = async (est: Estimate) => {
    setDownloadingId(est.id);
    setPdfEstimate(est);
    // 600ms delay - enough for React DOM to hydrate on slow mobile devices
    await new Promise(resolve => setTimeout(resolve, 600));
    
    if (!printRef.current) {
      setDownloadingId(null);
      setPdfEstimate(null);
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
      const fileName = `Estimate_${est.estimateNumber}.pdf`;

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
    } catch (error: any) {
      console.error('Failed to generate PDF', error);
      alert('PDF Error: ' + (error.message || 'Unknown error during capture'));
    } finally {
      setDownloadingId(null);
      setPdfEstimate(null);
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    converted: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <header className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estimates &amp; Quotations</h1>
          <p className="text-muted-foreground text-sm mt-1">Create quotes and convert them to invoices in one click.</p>
        </div>
        <Button size="sm" onClick={() => { setCurrentEstimate(emptyEstimate()); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Estimate
        </Button>
      </header>

      <DownloadModal 
        isOpen={saveStatus.isOpen} 
        onClose={() => setSaveStatus(prev => ({ ...prev, isOpen: false }))}
        fileName={saveStatus.fileName}
        fileUri={saveStatus.fileUri}
      />

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Estimate</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Client Name *" value={currentEstimate.clientDetails.name}
                list="saved-clients"
                onChange={e => {
                  const val = e.target.value;
                  const match = config.savedClients?.find(c => c.name === val);
                  if (match) {
                    setCurrentEstimate(prev => ({ ...prev, clientDetails: { name: match.name, email: match.email, phone: match.phone, gstin: match.gstin, address: match.address } }));
                  } else {
                    setCurrentEstimate(prev => ({ ...prev, clientDetails: { ...prev.clientDetails, name: val } }));
                  }
                }}
                placeholder="Client Corp" />
              <Input label="Client Email" type="email" value={currentEstimate.clientDetails.email}
                onChange={e => setCurrentEstimate(prev => ({ ...prev, clientDetails: { ...prev.clientDetails, email: e.target.value } }))}
                placeholder="client@corp.com" />
              <Input label="Phone" value={currentEstimate.clientDetails.phone}
                onChange={e => setCurrentEstimate(prev => ({ ...prev, clientDetails: { ...prev.clientDetails, phone: formatPhoneNumber(e.target.value) } }))}
                placeholder="+91 98765 43210" />
              <Input label="Valid Until" type="date" value={currentEstimate.validUntil}
                onChange={e => setCurrentEstimate(prev => ({ ...prev, validUntil: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Items</h3>
              {currentEstimate.items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-lg bg-muted/30">
                  <div className="col-span-4">
                    <Input label={idx === 0 ? 'Name' : ''} placeholder="Item name" value={item.name}
                      list="saved-items"
                      onChange={e => {
                        const val = e.target.value;
                        const match = config.savedItems?.find(i => i.name === val);
                        if (match) {
                          updateItem(item.id, 'name', match.name);
                          updateItem(item.id, 'hsn', match.hsn);
                          updateItem(item.id, 'rate', match.rate);
                          updateItem(item.id, 'gstPercent', match.gstPercent);
                        } else {
                          updateItem(item.id, 'name', val);
                        }
                      }} />
                  </div>
                  <div className="col-span-2"><Input label={idx === 0 ? 'Qty' : ''} type="number" min="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} /></div>
                  <div className="col-span-2"><Input label={idx === 0 ? 'Rate' : ''} type="number" min="0" value={item.rate} onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} /></div>
                  <div className="col-span-2"><Input label={idx === 0 ? 'GST%' : ''} type="number" min="0" value={item.gstPercent} onChange={e => updateItem(item.id, 'gstPercent', parseFloat(e.target.value) || 0)} /></div>
                  <div className="col-span-2 flex justify-end">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeItem(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
            </div>

            <Textarea label="Notes" value={currentEstimate.notes} onChange={e => setCurrentEstimate(prev => ({ ...prev, notes: e.target.value }))} placeholder="Any notes..." className="min-h-[60px]" />

            <div className="flex gap-2">
              <Button onClick={handleSave}><FileText className="w-4 h-4 mr-2" /> Save Estimate</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">All Estimates ({estimates.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {estimates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground p-4">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-foreground">No estimates yet</p>
              <p className="text-sm mt-1">Create your first estimate to get started.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-muted text-muted-foreground text-[11px] uppercase border-b">
                    <tr>
                      <th className="py-2 px-3">Estimate #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Client</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-[13px]">
                    {estimates.map(est => (
                      <tr key={est.id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-primary cursor-pointer hover:underline" onClick={() => setViewingEstimate(est)}>{est.estimateNumber}</td>
                        <td className="py-2 px-3 text-muted-foreground">{format(new Date(est.date), 'dd MMM yyyy')}</td>
                        <td className="py-2 px-3">{est.clientDetails.name || 'Unnamed'}</td>
                        <td className="py-2 px-3 text-right font-medium">₹{calcTotal(est).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${statusColors[est.status]}`}>{est.status}</span>
                        </td>
                        <td className="py-1 px-3">
                          <div className="flex justify-center gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="View" onClick={() => setViewingEstimate(est)}>
                              <Eye className="w-3.5 h-3.5 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Download PDF" onClick={() => downloadPDF(est)} disabled={downloadingId === est.id}>
                              <Download className={`w-3.5 h-3.5 ${downloadingId === est.id ? 'animate-pulse text-primary' : 'text-green-500'}`} />
                            </Button>
                            {est.status !== 'converted' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Convert to Invoice" onClick={() => handleConvertToInvoice(est)}>
                                <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete" onClick={() => {
                              if (confirm('Delete this estimate?')) deleteEstimate(est.id);
                            }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border">
                {estimates.map(est => (
                  <div key={est.id} className="p-4 space-y-3 bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <div onClick={() => setViewingEstimate(est)} className="cursor-pointer">
                        <div className="text-sm font-bold text-primary">{est.estimateNumber}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(est.date), 'dd MMM yyyy')}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[est.status]}`}>{est.status}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[13px] font-semibold">{est.clientDetails.name || 'Unnamed'}</div>
                        <div className="text-[12px] font-bold text-primary mt-0.5">₹{calcTotal(est).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" onClick={() => setViewingEstimate(est)} className="h-8 w-8 rounded-lg" title="View">
                          <Eye className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => downloadPDF(est)} disabled={downloadingId === est.id} className="h-8 w-8 rounded-lg" title="Download PDF">
                          <Download className={`w-4 h-4 ${downloadingId === est.id ? 'animate-pulse text-primary' : 'text-green-500'}`} />
                        </Button>
                        {est.status !== 'converted' && (
                          <Button variant="outline" size="icon" onClick={() => handleConvertToInvoice(est)} className="h-8 w-8 rounded-lg" title="Convert to Invoice">
                            <ArrowRight className="w-4 h-4 text-emerald-500" />
                          </Button>
                        )}
                        <Button variant="outline" size="icon" onClick={() => { if (confirm('Delete this estimate?')) deleteEstimate(est.id); }} className="h-8 w-8 rounded-lg" title="Delete">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* View Modal */}
      {viewingEstimate && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-4xl my-8 mx-4 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-background z-10">
              <h2 className="text-xl font-bold">Estimate: {viewingEstimate.estimateNumber}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadPDF(viewingEstimate)} disabled={downloadingId === viewingEstimate.id}>
                  <Download className={`w-4 h-4 mr-2 ${downloadingId === viewingEstimate.id ? 'animate-pulse' : ''}`} />
                  {downloadingId === viewingEstimate.id ? 'Generating...' : 'Download PDF'}
                </Button>
                {viewingEstimate.status !== 'converted' && (
                  <Button size="sm" onClick={() => { handleConvertToInvoice(viewingEstimate); setViewingEstimate(null); }}>
                    <ArrowRight className="w-4 h-4 mr-2" /> Convert to Invoice
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setViewingEstimate(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            {/* overflow-x-auto allows the fixed-width (794px) preview to scroll on small screens */}
            <div className="p-4 md:p-8 bg-muted/30 overflow-x-auto">
              <div className="shadow-2xl bg-white mx-auto" style={{ width: '794px' }}>
                <InvoicePreview invoice={estimateAsInvoice(viewingEstimate)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {pdfEstimate && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '794px', zIndex: -10, opacity: 0.01, pointerEvents: 'none', backgroundColor: '#ffffff' }}>
          <InvoicePreview ref={printRef} invoice={pdfEstimate as unknown as any} />
        </div>
      )}

      <datalist id="saved-clients">
        {config.savedClients?.map(c => <option key={c.id} value={c.name} />)}
      </datalist>
      <datalist id="saved-items">
        {config.savedItems?.map(i => <option key={i.id} value={i.name} />)}
      </datalist>
    </div>
  );
}
