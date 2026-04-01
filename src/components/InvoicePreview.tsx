import React, { forwardRef } from 'react';
import type { Invoice } from '../types';
import { TRANSLATIONS } from '../types';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { useInvoice } from '../context/InvoiceContext';

interface InvoicePreviewProps {
  invoice: Invoice;
}

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(({ invoice }, ref) => {
  const { businessDetails, clientDetails, items, taxType } = invoice;
  const { config } = useInvoice();

  const theme = config.defaultTheme || 'minimal';
  const lang = config.defaultLanguage || 'en';
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  
  let totalTax = 0;
  let taxBreakdown: Record<number, number> = {};

  items.forEach(item => {
    const taxAmount = (item.quantity * item.rate) * (item.gstPercent / 100);
    totalTax += taxAmount;
    if (item.gstPercent > 0) {
      taxBreakdown[item.gstPercent] = (taxBreakdown[item.gstPercent] || 0) + taxAmount;
    }
  });

  const totalAmount = subtotal + totalTax;

  // UPI intent URI format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR
  const upiUrl = businessDetails.upiId 
    ? `upi://pay?pa=${businessDetails.upiId}&pn=${encodeURIComponent(businessDetails.name || 'Merchant')}&am=${totalAmount.toFixed(2)}&cu=INR`
    : '';

  // Theme Base Classes
  const getContainerClass = () => {
    switch(theme) {
      case 'corporate': return "bg-white text-slate-900 border-t-8 border-t-emerald-600 shadow-md";
      case 'cyberpunk': return "bg-zinc-950 text-emerald-400 border border-fuchsia-600 shadow-[0_0_15px_rgba(192,38,211,0.5)]";
      default: return "bg-white text-slate-900 border shadow-md";
    }
  };

  const getHeaderClass = () => {
    switch(theme) {
      case 'corporate': return "text-emerald-700";
      case 'cyberpunk': return "text-fuchsia-400 drop-shadow-[0_0_5px_rgba(232,121,249,0.8)]";
      default: return "text-slate-800";
    }
  };

  const getTextClass = () => {
    switch(theme) {
      case 'cyberpunk': return "text-emerald-300";
      default: return "text-slate-600";
    }
  };

  const getTableClass = () => {
    switch(theme) {
      case 'corporate': return "bg-emerald-50 text-emerald-900";
      case 'cyberpunk': return "bg-zinc-900 text-fuchsia-300 border-y border-fuchsia-500/50";
      default: return "bg-slate-100/50 text-slate-600";
    }
  };

  return (
    <div 
      ref={ref} 
      className={`p-10 w-full max-w-[800px] mx-auto ${getContainerClass()}`}
      style={{ minHeight: '1056px', width: '794px', fontFamily: theme === 'cyberpunk' ? 'Courier New, monospace' : 'Arial, Helvetica, sans-serif' }} 
    >
      <div className={`flex justify-between items-start pb-6 mb-6 ${theme === 'cyberpunk' ? 'border-b-2 border-fuchsia-600/50' : 'border-b border-slate-200'}`}>
        <div>
          <h1 className={`text-4xl font-extrabold uppercase tracking-wider ${getHeaderClass()}`}>
            {t.invoice}
          </h1>
          <p className="text-sm mt-1 opacity-70"># {invoice.invoiceNumber}</p>
          <div className={`text-sm mt-4 space-y-1 ${getTextClass()}`}>
            <p><span className={`font-semibold ${theme === 'cyberpunk' ? 'text-fuchsia-400' : 'text-slate-800'}`}>{t.date}:</span> {format(new Date(invoice.date), 'dd MMM yyyy')}</p>
            <p><span className={`font-semibold ${theme === 'cyberpunk' ? 'text-fuchsia-400' : 'text-slate-800'}`}>{t.dueDate}:</span> {format(new Date(invoice.dueDate), 'dd MMM yyyy')}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className={`text-xl font-bold uppercase tracking-tight ${getHeaderClass()}`}>{businessDetails.name || 'Your Business Name'}</h2>
          <p className={`text-sm mt-1 ${getTextClass()}`}>{businessDetails.address}</p>
          <p className={`text-sm ${getTextClass()}`}>{businessDetails.email}</p>
          <p className={`text-sm ${getTextClass()}`}>{businessDetails.phone}</p>
          {businessDetails.gstin && <p className={`text-sm font-medium mt-1 ${theme === 'cyberpunk' ? 'text-fuchsia-300' : ''}`}>GSTIN: {businessDetails.gstin}</p>}
        </div>
      </div>

      <div className="mb-8">
        <h3 className={`text-xs font-bold uppercase mb-2 ${theme === 'cyberpunk' ? 'text-fuchsia-500' : 'text-slate-400'}`}>{t.billTo}</h3>
        <h4 className={`text-lg font-bold ${getHeaderClass()}`}>{clientDetails.name || 'Client Name'}</h4>
        <p className={`text-sm ${getTextClass()}`}>{clientDetails.address}</p>
        <p className={`text-sm ${getTextClass()}`}>{clientDetails.email}</p>
        <p className={`text-sm ${getTextClass()}`}>{clientDetails.phone}</p>
        {clientDetails.gstin && <p className={`text-sm font-medium mt-1 ${theme === 'cyberpunk' ? 'text-fuchsia-300' : ''}`}>GSTIN: {clientDetails.gstin}</p>}
      </div>

      <table className="w-full text-sm text-left mb-6">
        <thead className={`uppercase text-xs font-bold ${getTableClass()}`}>
          <tr>
            <th className="py-3 px-4 rounded-l-sm">{t.description}</th>
            <th className="py-3 px-4 w-24">HSN/SAC</th>
            <th className="py-3 px-4 w-20 text-center">{t.qty}</th>
            <th className="py-3 px-4 w-32 text-right">{t.rate}</th>
            <th className="py-3 px-4 w-24 text-right">{t.tax} (%)</th>
            <th className="py-3 px-4 w-32 text-right rounded-r-sm">{t.amount}</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${theme === 'cyberpunk' ? 'divide-zinc-800' : 'divide-slate-100'}`}>
          {items.map((item, index) => (
            <tr key={index}>
              <td className={`py-4 px-4 font-semibold ${theme === 'cyberpunk' ? 'text-emerald-300' : 'text-slate-800'}`}>{item.name || 'Item Name'}</td>
              <td className={`py-4 px-4 ${getTextClass()}`}>{item.hsn || '-'}</td>
              <td className="py-4 px-4 text-center">{item.quantity}</td>
              <td className="py-4 px-4 text-right">₹ {item.rate.toFixed(2)}</td>
              <td className="py-4 px-4 text-right">{item.gstPercent}%</td>
              <td className={`py-4 px-4 text-right font-medium ${theme === 'cyberpunk' ? 'text-fuchsia-400' : ''}`}>₹ {(item.quantity * item.rate).toFixed(2)}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={6} className="py-8 text-center opacity-50 italic">No items added</td></tr>
          )}
        </tbody>
      </table>

      <div className="flex justify-between items-start mt-8">
        <div className="w-1/2 pr-8">
          {businessDetails.upiId && (
            <div className={`border rounded-lg p-4 inline-block ${theme === 'cyberpunk' ? 'border-fuchsia-600/50 bg-zinc-900/50' : 'border-slate-200 bg-slate-50'}`}>
              <p className={`text-xs font-bold uppercase mb-3 ${theme === 'cyberpunk' ? 'text-fuchsia-400' : 'text-slate-500'}`}>Scan to Pay via UPI</p>
              <div className={theme === 'cyberpunk' ? 'p-2 bg-white rounded-md inline-block' : ''}>
                <QRCodeSVG value={upiUrl} size={100} />
              </div>
              <p className={`text-xs font-medium mt-3 text-center ${theme === 'cyberpunk' ? 'text-emerald-400' : ''}`}>{businessDetails.upiId}</p>
            </div>
          )}
        </div>
        <div className="w-1/2">
          <div className="space-y-3">
            <div className={`flex justify-between text-sm ${getTextClass()}`}>
              <span>{t.subtotal}</span>
              <span>₹ {subtotal.toFixed(2)}</span>
            </div>
            
            {Object.keys(taxBreakdown).length > 0 && (
              <div className={`py-2 border-y space-y-2 ${theme === 'cyberpunk' ? 'border-zinc-800/80' : 'border-slate-100'}`}>
                {Object.entries(taxBreakdown).map(([percent, amount]) => {
                  if (taxType === 'IGST') {
                    return (
                      <div key={percent} className={`flex justify-between text-sm ${getTextClass()}`}>
                        <span>IGST ({percent}%)</span>
                        <span>₹ {amount.toFixed(2)}</span>
                      </div>
                    );
                  }
                  const halfGst = parseFloat(percent) / 2;
                  const halfAmount = amount / 2;
                  return (
                    <React.Fragment key={percent}>
                      <div className={`flex justify-between text-sm ${getTextClass()}`}>
                        <span>CGST ({halfGst}%)</span>
                        <span>₹ {halfAmount.toFixed(2)}</span>
                      </div>
                      <div className={`flex justify-between text-sm ${getTextClass()}`}>
                        <span>SGST ({halfGst}%)</span>
                        <span>₹ {halfAmount.toFixed(2)}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
            
            <div className={`flex justify-between text-xl font-black pt-2 ${getHeaderClass()}`}>
              <span>{t.total}</span>
              <span>₹ {totalAmount.toFixed(2)}</span>
            </div>
            <div className="text-right text-xs opacity-60">
              Amounts inclusive of taxes if specified
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div className={`mt-10 pt-6 border-t text-sm ${getTextClass()} ${theme === 'cyberpunk' ? 'border-fuchsia-600/30' : 'border-slate-200'}`}>
        {(invoice.notes || invoice.terms) && (
          <div className="grid grid-cols-2 gap-8 mb-6">
            {invoice.notes && (
              <div>
                <h4 className={`font-bold mb-2 uppercase text-xs ${theme === 'cyberpunk' ? 'text-fuchsia-500' : 'text-slate-800'}`}>{t.notes}</h4>
                <p className="whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <h4 className={`font-bold mb-2 uppercase text-xs ${theme === 'cyberpunk' ? 'text-fuchsia-500' : 'text-slate-800'}`}>{t.terms}</h4>
                <p className="whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Declaration */}
        <div className={`rounded-md p-3 mb-8 ${theme === 'cyberpunk' ? 'bg-zinc-900 border border-fuchsia-600/30' : 'bg-slate-50 border border-slate-200'}`}>
          <h4 className={`font-bold uppercase text-[10px] mb-2 tracking-wider ${theme === 'cyberpunk' ? 'text-fuchsia-400' : 'text-slate-500'}`}>Declaration</h4>
          <ol className={`list-decimal list-inside space-y-1 text-[11px] ${theme === 'cyberpunk' ? 'text-emerald-300' : 'text-slate-600'}`}>
            <li>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</li>
            <li>Interest shall be charged at <strong>24% per annum</strong> on overdue amounts.</li>
            <li>Goods once sold are <strong>not Returnable or Exchangeable</strong>.</li>
          </ol>
        </div>

        {/* Authorized Signature */}
        <div className="flex justify-end">
          <div className="text-center min-w-[180px]">
            <div className={`border-b-2 mb-2 pb-10 ${theme === 'cyberpunk' ? 'border-fuchsia-500' : 'border-slate-400'}`} />
            <p className={`text-xs font-bold uppercase tracking-widest ${theme === 'cyberpunk' ? 'text-fuchsia-400' : 'text-slate-700'}`}>
              Authorized Signature
            </p>
            <p className={`text-[10px] mt-1 ${theme === 'cyberpunk' ? 'text-emerald-400' : 'text-slate-500'}`}>
              {invoice.businessDetails.name || 'Business Name'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

InvoicePreview.displayName = 'InvoicePreview';
