import { useRef, useState } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Settings as SettingsIcon, Download, Upload, FileSpreadsheet, Database, Globe, Languages, Sun, Moon } from 'lucide-react';
import type { CurrencyCode, LanguageCode } from '../types';
import { CURRENCY_SYMBOLS } from '../types';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { DownloadModal } from '../components/DownloadModal';
import { textToBase64, downloadWebFile } from '../lib/utils';
import { useTheme } from '../App';

export default function Settings() {
  const { config, updateConfig, invoices, estimates, expenses, creditNotes, purchaseOrders, recurringTemplates, challans } = useInvoice();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveStatus, setSaveStatus] = useState({ isOpen: false, fileName: '', fileUri: '' });

  // Invoice PDF Templates locked to "minimal"

  // ── CSV Export ──
  const handleExportCSV = async () => {
    let csv = 'Invoice #,Date,Client,Email,Amount,Paid,Status\n';
    invoices.forEach(inv => {
      const total = inv.items.reduce((s, i) => s + i.quantity * i.rate * (1 + i.gstPercent / 100), 0);
      csv += `"${inv.invoiceNumber}","${inv.date}","${inv.clientDetails.name}","${inv.clientDetails.email}","${total.toFixed(2)}","${(inv.amountPaid || 0).toFixed(2)}","${inv.status || 'draft'}"\n`;
    });

    csv += '\n\nExpense Date,Description,Category,Amount,Payment Method\n';
    expenses.forEach(e => {
      csv += `"${e.date}","${e.description}","${e.category}","${e.amount.toFixed(2)}","${e.paymentMethod}"\n`;
    });

    csv += '\n\nItem,HSN,Rate,GST%,Stock\n';
    config.savedItems.forEach(i => {
      csv += `"${i.name}","${i.hsn}","${i.rate}","${i.gstPercent}%","${i.stock ?? 'N/A'}"\n`;
    });

    csv += '\n\nClient,Email,Phone,GSTIN\n';
    config.savedClients.forEach(c => {
      csv += `"${c.name}","${c.email}","${c.phone}","${c.gstin}"\n`;
    });

    const fileName = `BillSaathi_Export_${new Date().toISOString().split('T')[0]}.csv`;
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

  // ── JSON Backup ──
  const handleBackup = async () => {
    const backup = {
      version: 2,
      exportDate: new Date().toISOString(),
      config, invoices, estimates, expenses, creditNotes, purchaseOrders, recurringTemplates, challans,
    };
    const backupStr = JSON.stringify(backup, null, 2);
    const fileName = `BillSaathi_Backup_${new Date().toISOString().split('T')[0]}.json`;
    const info = await Device.getInfo();

    if (info.platform === 'android' || info.platform === 'ios') {
      try {
        const base64Data = await textToBase64(backupStr, 'application/json');
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
          const base64Data = await textToBase64(backupStr, 'application/json');
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
      downloadWebFile(backupStr, fileName, 'application/json');
    }
  };

  // ── JSON Restore ──
  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.config || !data.invoices) { alert('Invalid backup file'); return; }
        if (!confirm('This will REPLACE all your current data. Are you sure?')) return;

        localStorage.setItem('quickbill_config', JSON.stringify(data.config));
        localStorage.setItem('quickbill_invoices', JSON.stringify(data.invoices || []));
        localStorage.setItem('quickbill_estimates', JSON.stringify(data.estimates || []));
        localStorage.setItem('quickbill_expenses', JSON.stringify(data.expenses || []));
        localStorage.setItem('quickbill_credit_notes', JSON.stringify(data.creditNotes || []));
        localStorage.setItem('quickbill_purchase_orders', JSON.stringify(data.purchaseOrders || []));
        localStorage.setItem('quickbill_recurring', JSON.stringify(data.recurringTemplates || []));

        alert('✅ Data restored! Reloading...');
        window.location.reload();
      } catch {
        alert('Failed to restore backup. Invalid file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto pb-24">
      <DownloadModal 
        isOpen={saveStatus.isOpen} 
        onClose={() => setSaveStatus(prev => ({ ...prev, isOpen: false }))}
        fileName={saveStatus.fileName}
        fileUri={saveStatus.fileUri}
      />
      
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage themes, export data, and backups.</p>
      </header>

      {/* Theme Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-primary" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Choose how BillSaathi looks to you.</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                theme === 'light' ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
            >
              <Sun className={`w-5 h-5 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-left">
                <div className="text-sm font-semibold">Light</div>
                <div className="text-xs text-muted-foreground">Bright & clean</div>
              </div>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                theme === 'dark' ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
            >
              <Moon className={`w-5 h-5 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-left">
                <div className="text-sm font-semibold">Dark</div>
                <div className="text-xs text-muted-foreground">Easy on eyes</div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>



      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" /> Data Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Export all invoices, expenses, items, and clients to a CSV spreadsheet file.</p>
          <Button variant="secondary" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" /> Export to CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" /> Default Currency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Select the default currency for new invoices. You can override per invoice.</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {(Object.keys(CURRENCY_SYMBOLS) as CurrencyCode[]).map(code => (
              <button key={code} onClick={() => updateConfig({ defaultCurrency: code })}
                className={`p-3 rounded-lg border-2 text-center transition-all ${(config.defaultCurrency || 'INR') === code ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent bg-muted/50 hover:bg-muted'}`}>
                <div className="text-lg font-bold">{CURRENCY_SYMBOLS[code]}</div>
                <div className="text-xs text-muted-foreground">{code}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-primary" /> Invoice Language
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Select the language for your PDF invoice labels (Header, Dates, Totals).</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { code: 'en', name: 'English' },
              { code: 'hi', name: 'Hindi (हिन्दी)' },
              { code: 'te', name: 'Telugu (తెలుగు)' },
              { code: 'ta', name: 'Tamil (தமிழ்)' },
              { code: 'mr', name: 'Marathi (मರಾठी)' },
              { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
              { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
              { code: 'bn', name: 'Bengali (বাংলা)' },
            ].map(lang => (
              <button key={lang.code} onClick={() => updateConfig({ defaultLanguage: lang.code as LanguageCode })}
                className={`p-2.5 rounded-lg border-2 text-center transition-all ${(config.defaultLanguage || 'en') === lang.code ? 'border-primary bg-primary/5 shadow-sm font-bold' : 'border-transparent bg-muted/50 hover:bg-muted font-medium'}`}>
                <div className="text-xs">{lang.name}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> Backup & Restore
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Download a full backup of your BillSaathi database (JSON) or restore from a previous backup.</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleBackup}>
              <Download className="w-4 h-4 mr-2" /> Download Backup
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Restore from Backup
            </Button>
            <input ref={fileInputRef} type="file" accept=".json,application/json,*/*" onChange={handleRestore} className="absolute w-px h-px opacity-0 overflow-hidden" />
          </div>
          <p className="text-xs text-muted-foreground">⚠️ Restoring will replace ALL your current data.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" /> About
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="text-lg font-bold text-foreground">
              BillSaathi <span className="text-muted-foreground font-normal mx-1">—</span> <span className="text-primary">Your Billing Partner</span>
            </p>
            <p className="text-xs font-medium">No login required</p>
            <p className="text-xs opacity-80">All data is stored on your device only.</p>
            <div className="pt-2">
               <p className="text-[10px] opacity-50 uppercase tracking-widest font-bold">Developed by DAKSH KHANDAL</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
