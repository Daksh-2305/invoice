import { useState, useRef, useEffect } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import type { Invoice, InvoiceItem } from '../types';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Plus, Trash2, Save, Send, Download, Share2, Building2, ExternalLink, Calculator, IndianRupee, ChevronDown } from 'lucide-react';
import { InvoicePreview } from '../components/InvoicePreview';
import { useLocation, Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatPhoneNumber } from '../lib/utils';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { DownloadModal } from '../components/DownloadModal';
import { Browser } from '@capacitor/browser';





export default function CreateInvoice() {
  const { config, updateConfig, saveInvoice, saveClient, adjustStock } = useInvoice();
  const printRef = useRef<HTMLDivElement>(null);
  
  const location = useLocation();
  
  const [invoice, setInvoice] = useState<Invoice>(() => {
    const today = new Date();
    // Helper to format date in local timezone YYYY-MM-DD
    const getLocalDateString = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const todayStr = getLocalDateString(today);
    const defaultDue = new Date(today);
    defaultDue.setDate(today.getDate() + 7);
    const dueStr = getLocalDateString(defaultDue);

    if (location.state?.templateInvoice) {
      return {
        ...location.state.templateInvoice,
        invoiceNumber: `INV-${String(config.lastInvoiceNumber + 1).padStart(4, '0')}`,
        date: todayStr,
        dueDate: dueStr,
      };
    }
    return {
      id: crypto.randomUUID(),
      invoiceNumber: `INV-${String(config.lastInvoiceNumber + 1).padStart(4, '0')}`,
      date: todayStr,
      dueDate: dueStr,
      businessDetails: config.savedBusinessDetails || { name: '', address: '', gstin: '', email: '', phone: '', upiId: '' },
      clientDetails: { name: '', address: '', gstin: '', email: '', phone: '' },
      items: [],
      notes: 'Thank you for your business!',
      terms: 'Please pay within 7 days.',
      taxType: 'CGST_SGST'
    };
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{isOpen: boolean, fileName: string, fileUri: string}>({
    isOpen: false,
    fileName: '',
    fileUri: ''
  });


  // Sync business details from saved profile
  useEffect(() => {
    if (config.savedBusinessDetails) {
      setInvoice(prev => ({ ...prev, businessDetails: config.savedBusinessDetails! }));
    }
  }, [config.savedBusinessDetails]);

  const handleClientChange = (field: keyof Invoice['clientDetails'], value: string) => {
    setInvoice(prev => ({ ...prev, clientDetails: { ...prev.clientDetails, [field]: value } }));
  };

  const addItem = () => {
    const newItem: InvoiceItem = { id: crypto.randomUUID(), name: '', hsn: '', quantity: 1, rate: 0, gstPercent: 18 };
    setInvoice(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeItem = (id: string) => {
    setInvoice(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  const performSave = (showAlert = true) => {
    saveInvoice(invoice);

    if (invoice.clientDetails.name.trim()) {
      const existingClient = config.savedClients?.find(c => c.name.toLowerCase() === invoice.clientDetails.name.trim().toLowerCase());
      if (!existingClient) {
        saveClient({
          id: crypto.randomUUID(),
          name: invoice.clientDetails.name.trim(),
          email: invoice.clientDetails.email,
          phone: invoice.clientDetails.phone,
          gstin: invoice.clientDetails.gstin,
          address: invoice.clientDetails.address,
        });
      }
    }

    // Deduct stock for saved items
    invoice.items.forEach(item => {
      const savedItem = config.savedItems?.find(i => i.name === item.name || i.hsn === item.hsn);
      if (savedItem && savedItem.stock !== undefined) {
        adjustStock(savedItem.id, -item.quantity);
      }
    });

    const currentInvNum = parseInt(invoice.invoiceNumber.replace(/\D/g, ''));
    if (!isNaN(currentInvNum) && currentInvNum > config.lastInvoiceNumber) {
      updateConfig({ 
        lastInvoiceNumber: currentInvNum
      });
    }

    if (showAlert) {
      alert('Invoice saved successfully to history!');
    }
  };

  const handleSave = () => performSave(true);


  const downloadPDF = async () => {
    if (!printRef.current) return;
    performSave(false);
    setIsGenerating(true);
    
    // Temporarily remove transform to prevent html2canvas text overlapping
    const parentContainer = printRef.current.parentElement;
    const originalTransform = parentContainer?.style.transform;
    const originalMargin = parentContainer?.style.marginBottom;
    
    if (parentContainer) {
      parentContainer.style.transform = 'none';
      parentContainer.style.marginBottom = '0';
    }
    
    try {
      // 600ms delay - enough for React DOM to hydrate on slow mobile devices
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        logging: true,
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
          
          // Open Success Modal
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
            // Open Success Modal
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
      // Restore scaled view
      if (parentContainer) {
        parentContainer.style.transform = originalTransform || '';
        parentContainer.style.marginBottom = originalMargin || '';
      }
      setIsGenerating(false);
    }
  };

  const sendWhatsApp = async () => {
    if (!printRef.current) return;
    performSave(false);
    
    // Generate text
    const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const totalTax = invoice.items.reduce((sum, item) => sum + (item.quantity * item.rate * (item.gstPercent/100)), 0);
    const total = subtotal + totalTax;

    let text = `*INVOICE: ${invoice.invoiceNumber}*\n`;
    if (invoice.businessDetails.name) text += `From: ${invoice.businessDetails.name}\n`;
    text += `Date: ${invoice.date}\n\n`;
    
    if (invoice.items.length > 0) {
      text += `*Items:*\n`;
      invoice.items.forEach((item, index) => {
        const itemTotal = item.quantity * item.rate * (1 + item.gstPercent/100);
        text += `${index + 1}. ${item.name || 'Item'}\n`;
        text += `   Qty: ${item.quantity} | Rate: ₹${item.rate} | GST: ${item.gstPercent}%\n`;
        text += `   Amount: ₹${itemTotal.toFixed(2)}\n\n`;
      });
    }

    text += `*Subtotal:* ₹${subtotal.toFixed(2)}\n`;
    text += `*Tax:* ₹${totalTax.toFixed(2)}\n`;
    text += `*Total Amount:* ₹${total.toFixed(2)}\n\n`;

    if (invoice.businessDetails.upiId) {
        text += `*Payment via UPI:*\n`;
        text += `Please copy the UPI ID below and paste it into GPay, PhonePe, or Paytm to pay 💳:\n`;
        text += `*${invoice.businessDetails.upiId}*\n\n`;
    }
    
    if (invoice.notes) {
        text += `Notes: ${invoice.notes}\n\n`;
    }
    
    text += `Thank you for your business!`;

    const encodedText = encodeURIComponent(text);
    let href = `https://wa.me/?text=${encodedText}`;
    if (invoice.clientDetails.phone) {
      let phone = invoice.clientDetails.phone.replace(/\D/g, '');
      if (phone.length === 10) {
        phone = '91' + phone;
      }
      href = `https://wa.me/${phone}?text=${encodedText}`;
    }
    
    // Open WhatsApp directly to client's chat
    try {
      setIsGenerating(true);
      const info = await Device.getInfo();

      if (info.platform === 'android' || info.platform === 'ios') {
        // On mobile: open WhatsApp directly with the client's number and invoice text
        await Browser.open({ url: href });
      } else {
        // On web: capture image to clipboard and open WhatsApp
        if (!printRef.current) { window.open(href, '_blank'); return; }
        const parentContainer = printRef.current.parentElement;
        const originalTransform = parentContainer?.style.transform;
        if (parentContainer) { parentContainer.style.transform = 'none'; parentContainer.style.marginBottom = '0'; }
        await new Promise(resolve => setTimeout(resolve, 50));
        const canvas = await html2canvas(printRef.current, {
          scale: 2, useCORS: true, logging: false, windowWidth: 794, backgroundColor: '#ffffff',
        });
        if (parentContainer) parentContainer.style.transform = originalTransform || '';
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              alert("✨ Invoice image copied! In WhatsApp, press Ctrl+V (or Right-Click → Paste) to attach it.");
            } catch { /* clipboard failed silently */ }
            window.open(href, '_blank');
          }
        }, 'image/png');
      }
    } catch (e) {
      console.error(e);
      window.open(href, '_blank');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNativeShare = async () => {
    if (!printRef.current) return;
    performSave(false);
    
    try {
      setIsGenerating(true);
      const parentContainer = printRef.current.parentElement;
      const originalTransform = parentContainer?.style.transform;
      
      if (parentContainer) {
        parentContainer.style.transform = 'none';
        parentContainer.style.marginBottom = '0';
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 794,
        backgroundColor: '#ffffff',
      });
      
      if (parentContainer) {
        parentContainer.style.transform = originalTransform || '';
      }
      
      const imgData = canvas.toDataURL('image/png');
      const fileName = `Invoice_${invoice.invoiceNumber}.png`;
      const info = await Device.getInfo();

      if (info.platform === 'android' || info.platform === 'ios') {
        const base64 = imgData.split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });
        
        await Share.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: `Invoice ${invoice.invoiceNumber} from ${invoice.businessDetails.name || 'BillSaathi'}`,
          url: savedFile.uri,
        });
      } else if (navigator.share) {
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], fileName, { type: 'image/png' });
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({
                title: `Invoice ${invoice.invoiceNumber}`,
                text: `Invoice ${invoice.invoiceNumber} from ${invoice.businessDetails.name || 'us'}`,
                files: [file]
              });
            } else {
              alert("Your device doesn't support sharing files directly. Try downloading it instead!");
            }
          }
        }, 'image/png');
      } else {
        alert("Native share is not supported on this browser.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to share.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-2.5 animate-in fade-in duration-500 pb-24">
      <header className="flex justify-between items-center sm:flex-row flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Create Invoice</h1>
        <div className="flex space-x-2 lg:w-auto w-full justify-between sm:justify-end">
          <Button variant="outline" size="sm" onClick={handleSave} className="flex-1 sm:flex-none">
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
          
          <div className="flex sm:hidden">
            <Button size="sm" onClick={downloadPDF} disabled={isGenerating}>
                 {isGenerating ? '...' : <Download className="w-4 h-4" />}
            </Button>
          </div>

          <div className="hidden sm:flex space-x-2">
            <Button variant="secondary" size="sm" onClick={handleNativeShare} title="Share to any app">
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
            <Button variant="secondary" size="sm" onClick={sendWhatsApp}>
              <Send className="w-4 h-4 mr-2" /> WhatsApp
            </Button>
            <Button size="sm" onClick={downloadPDF} disabled={isGenerating}>
              <Download className="w-4 h-4 mr-2" /> 
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>

          <div className="sm:hidden relative">
            <Button variant="secondary" size="sm" className="px-2" onClick={() => setShowShareMenu(!showShareMenu)}>
               <ChevronDown className="w-4 h-4" />
            </Button>
            {showShareMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-40 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                   <button onClick={() => { setShowShareMenu(false); handleNativeShare(); }} className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center">
                      <Share2 className="w-3.5 h-3.5 mr-2" /> Share
                   </button>
                   <button onClick={() => { setShowShareMenu(false); sendWhatsApp(); }} className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center border-t">
                      <Send className="w-3.5 h-3.5 mr-2" /> WhatsApp
                   </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <DownloadModal 
        isOpen={saveStatus.isOpen} 
        onClose={() => setSaveStatus(prev => ({ ...prev, isOpen: false }))}
        fileName={saveStatus.fileName}
        fileUri={saveStatus.fileUri}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-2.5">
          {/* Business Profile Info Banner */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
            <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {config.savedBusinessDetails?.name || 'No business profile set'}
              </p>
              <p className="text-xs text-muted-foreground">Business details auto-filled from your profile</p>
            </div>
            <Link
              to="/profile"
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline whitespace-nowrap"
            >
              Edit <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Client Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input 
                label="Client Name" 
                value={invoice.clientDetails.name} 
                list="saved-clients"
                onChange={e => {
                  const val = e.target.value;
                  const match = config.savedClients?.find(c => c.name === val);
                  if (match) {
                    setInvoice(prev => ({
                      ...prev,
                      clientDetails: {
                        name: match.name,
                        email: match.email,
                        phone: match.phone,
                        gstin: match.gstin,
                        address: match.address
                      }
                    }));
                  } else {
                    handleClientChange('name', val);
                  }
                }} 
                placeholder="Client Corp" 
              />
              <Input label="Client Email" type="email" value={invoice.clientDetails.email} onChange={e => handleClientChange('email', e.target.value)} placeholder="client@corp.com" />
              <Input label="Phone" value={invoice.clientDetails.phone} onChange={e => handleClientChange('phone', formatPhoneNumber(e.target.value))} placeholder="+91 8888888888" />
              <Input label="GSTIN (Optional)" value={invoice.clientDetails.gstin} onChange={e => handleClientChange('gstin', e.target.value)} placeholder="22BBBBB0000B1Z5" />
              <div className="md:col-span-2">
                <Input label="Address" value={invoice.clientDetails.address} onChange={e => handleClientChange('address', e.target.value)} placeholder="456 Client Avenue" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Items</CardTitle>
              <select 
                value={invoice.taxType} 
                onChange={(e) => setInvoice({...invoice, taxType: e.target.value as any})}
                className="text-sm border-input bg-background rounded-md px-2 py-1 border"
              >
                <option value="CGST_SGST">Local (CGST + SGST)</option>
                <option value="IGST">Inter-state (IGST)</option>
              </select>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice.items.map((item, index) => (
                <div key={item.id} className="relative p-2.5 border rounded-lg bg-slate-50/50 space-y-2 group transition-colors hover:border-primary/20">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="text-sm font-semibold text-slate-500">Item #{index + 1}</h4>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeItem(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="pr-2">
                    <Input 
                      label="Item Description"
                      placeholder="e.g. Website Design" 
                      value={item.name} 
                      list="saved-items"
                      onChange={e => {
                        const val = e.target.value;
                        const match = config.savedItems?.find(i => i.name === val);
                        if (match) {
                          setInvoice(prev => ({
                            ...prev,
                            items: prev.items.map(i => i.id === item.id ? { 
                              ...i, name: match.name, hsn: match.hsn, rate: match.rate, gstPercent: match.gstPercent 
                            } : i)
                          }));
                        } else {
                          updateItem(item.id, 'name', val);
                        }
                      }} 
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pr-2">
                    <Input 
                      label="HSN"
                      placeholder="e.g. 9983" 
                      value={item.hsn || ''} 
                      list="saved-hsns"
                      onChange={e => {
                        const val = e.target.value;
                        const match = config.savedItems?.find(i => i.hsn === val);
                        if (match && !item.name) {
                          setInvoice(prev => ({
                            ...prev,
                            items: prev.items.map(i => i.id === item.id ? { 
                              ...i, name: match.name, hsn: match.hsn, rate: match.rate, gstPercent: match.gstPercent 
                            } : i)
                          }));
                        } else {
                          updateItem(item.id, 'hsn', val);
                        }
                      }} 
                    />
                    <Input label="Qty" type="number" min="1" placeholder="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                    <Input label="Price (₹)" type="number" min="0" placeholder="0.00" value={item.rate} onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} />
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground/90">GST (%)</label>
                      <select 
                        value={item.gstPercent} 
                        onChange={e => updateItem(item.id, 'gstPercent', parseFloat(e.target.value))}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="secondary" onClick={addItem} className="w-full mt-4">
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </CardContent>
          </Card>


        </div>

        {/* Real-time Calculation Panel */}
        <div className="w-full max-w-[500px]">
          <div className="sticky top-6 space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" /> Bill Summary
            </h2>

            <Card>
              <CardContent className="p-0">
                {/* Item-wise breakdown */}
                {invoice.items.length > 0 ? (
                  <div className="divide-y divide-border">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <div className="col-span-4">Item</div>
                      <div className="col-span-2 text-right">Rate</div>
                      <div className="col-span-1 text-center">Qty</div>
                      <div className="col-span-2 text-right">Tax</div>
                      <div className="col-span-3 text-right">Amount</div>
                    </div>

                    {/* Item rows */}
                    {invoice.items.map((item, index) => {
                      const baseAmount = item.quantity * item.rate;
                      const taxAmount = baseAmount * (item.gstPercent / 100);
                      const totalAmount = baseAmount + taxAmount;
                      return (
                        <div key={item.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-[13px] items-center hover:bg-muted/30 transition-colors">
                          <div className="col-span-4 truncate font-medium">
                            <span className="text-muted-foreground mr-1">{index + 1}.</span>
                            {item.name || 'Unnamed'}
                          </div>
                          <div className="col-span-2 text-right tabular-nums">₹{item.rate.toLocaleString('en-IN')}</div>
                          <div className="col-span-1 text-center tabular-nums">{item.quantity}</div>
                          <div className="col-span-2 text-right text-[11px]">
                            <span className="text-muted-foreground">{item.gstPercent}%</span>
                            <div className="text-primary font-medium">₹{taxAmount.toFixed(2)}</div>
                          </div>
                          <div className="col-span-3 text-right font-semibold tabular-nums">₹{totalAmount.toFixed(2)}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-muted-foreground">
                    <IndianRupee className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Add items to see calculations</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Totals Card */}
            {invoice.items.length > 0 && (() => {
              const subtotal = invoice.items.reduce((s, i) => s + i.quantity * i.rate, 0);
              const totalTax = invoice.items.reduce((s, i) => s + i.quantity * i.rate * (i.gstPercent / 100), 0);
              const grandTotal = subtotal + totalTax;

              return (
                <Card className="overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-accent" />
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium tabular-nums">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    {invoice.taxType === 'CGST_SGST' ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">CGST</span>
                          <span className="font-medium tabular-nums text-primary">₹{(totalTax / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">SGST</span>
                          <span className="font-medium tabular-nums text-primary">₹{(totalTax / 2).toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IGST</span>
                        <span className="font-medium tabular-nums text-primary">₹{totalTax.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="border-t border-border pt-2 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold">Grand Total</span>
                        <span className="text-xl font-extrabold text-primary tabular-nums">
                          ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground text-right mt-1">
                        Amount inclusive of taxes {invoice.taxType === 'CGST_SGST' ? '(CGST + SGST)' : '(IGST)'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            <Card>
              <CardHeader><CardTitle className="text-base">Extra Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <Textarea label="Notes" value={invoice.notes} onChange={e => setInvoice({...invoice, notes: e.target.value})} placeholder="Thank you for your business!" className="min-h-[80px]" />
                <Textarea 
                  label="Terms & Conditions" 
                  value={invoice.terms} 
                  onChange={e => {
                    const newTerms = e.target.value;
                    const updatedInvoice = {...invoice, terms: newTerms};
                    const match = newTerms.match(/(\d+)\s+days?/i);
                    if (match) {
                      const days = parseInt(match[1]);
                      const dateObj = new Date(updatedInvoice.date);
                      dateObj.setDate(dateObj.getDate() + days);
                      
                      const year = dateObj.getFullYear();
                      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                      const day = String(dateObj.getDate()).padStart(2, '0');
                      updatedInvoice.dueDate = `${year}-${month}-${day}`;
                    }
                    setInvoice(updatedInvoice);
                  }} 
                  placeholder="Please pay within 7 days." 
                  className="min-h-[80px]"
                />
              </CardContent>
            </Card>

            {/* Item Count Badge */}
            {invoice.items.length > 0 && (
              <div className="text-center">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                  {invoice.items.length} item{invoice.items.length !== 1 ? 's' : ''} added
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden InvoicePreview for PDF generation */}
      <div style={{ position: 'fixed', left: 0, top: 0, width: '794px', zIndex: -10, opacity: 0.01, pointerEvents: 'none', backgroundColor: '#ffffff' }}>
        <InvoicePreview ref={printRef} invoice={invoice} />
      </div>
      <datalist id="saved-items">
        {config.savedItems?.map(matchItem => (
          <option key={matchItem.id} value={matchItem.name} />
        ))}
      </datalist>
      <datalist id="saved-hsns">
        {config.savedItems?.filter(i => i.hsn).map(matchItem => (
          <option key={matchItem.id} value={matchItem.hsn} />
        ))}
      </datalist>
      <datalist id="saved-clients">
        {config.savedClients?.map(client => (
          <option key={client.id} value={client.name} />
        ))}
      </datalist>
    </div>
  );
}
