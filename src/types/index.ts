export interface BusinessDetails {
  name: string;
  address: string;
  gstin: string;
  email: string;
  phone: string;
  logoUrl?: string;
  upiId?: string;
}

export interface ClientDetails {
  name: string;
  address: string;
  gstin: string;
  email: string;
  phone: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  hsn?: string;
  quantity: number;
  rate: number;
  gstPercent: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD' | 'AUD' | 'CAD' | 'JPY';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SGD: 'S$', AUD: 'A$', CAD: 'C$', JPY: '¥',
};

export type LanguageCode = 'en' | 'hi' | 'te' | 'ta' | 'mr' | 'gu' | 'kn' | 'bn';

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: { invoice: 'Invoice', billTo: 'Bill To', date: 'Date', dueDate: 'Due Date', description: 'Description', qty: 'Qty', rate: 'Rate', amount: 'Amount', subtotal: 'Subtotal', tax: 'Tax', total: 'Total', notes: 'Notes', terms: 'Terms' },
  hi: { invoice: 'बीजक (Invoice)', billTo: 'सेवा में', date: 'दिनांक', dueDate: 'देय तिथि', description: 'विवरण', qty: 'मात्रा', rate: 'दर', amount: 'राशि', subtotal: 'कुल राशि', tax: 'कर (Tax)', total: 'कुल योग', notes: 'टिप्पणी', terms: 'शर्तें' },
  te: { invoice: 'ఇన్వాయిస్', billTo: 'ఎవరికి', date: 'తేదీ', dueDate: 'గడువు తేదీ', description: 'వివరణ', qty: 'పరిమాణం', rate: 'ధర', amount: 'మొత్తం', subtotal: 'ఉపమొత్తం', tax: 'పన్ను', total: 'మొత్తం', notes: 'సూచనలు', terms: 'నిబంధనలు' },
  ta: { invoice: 'இன்வாய்ஸ்', billTo: 'யாருக்கு', date: 'தேதி', dueDate: 'கடைசி தேதி', description: 'விவரம்', qty: 'அளவு', rate: 'விலை', amount: 'தொகை', subtotal: 'துணைத் தொகை', tax: 'வரி', total: 'மொத்தம்', notes: 'குறிப்புகள்', terms: 'நிபந்தனைகள்' },
  mr: { invoice: 'बीजक', billTo: 'सेवा मध्ये', date: 'दिनांक', dueDate: 'देय तारीख', description: 'तपशील', qty: 'प्रमाण', rate: 'दर', amount: 'रक्कम', subtotal: 'एकूण', tax: 'कर', total: 'एकूण रक्कम', notes: 'टीप', terms: 'अटी' },
  gu: { invoice: 'ઈનવોઈસ', billTo: 'સેવામાં', date: 'તારીખ', dueDate: 'નિયત તારીખ', description: 'વિગત', qty: 'જથ્થો', rate: 'દર', amount: 'રકમ', subtotal: 'પેટા સરવાળો', tax: 'ટેક્સ', total: 'કુલ રકમ', notes: 'નોંધ', terms: 'શરતો' },
  kn: { invoice: 'ಇನ್ವಾಯ್ಸ್', billTo: 'ಯಾರಿಗೆ', date: 'ದಿನಾಂಕ', dueDate: 'ಅಂತಿಮ ದಿನಾಂಕ', description: 'ವಿವರ', qty: 'ಪ್ರಮಾಣ', rate: 'ದರ', amount: 'ಮೊತ್ತ', subtotal: 'ಉಪಮೊತ್ತ', tax: 'ತೆರಿಗೆ', total: 'ಒಟ್ಟು', notes: 'ಟಿಪ್ಪಣಿಗಳು', terms: 'ನಿಯಮಗಳು' },
  bn: { invoice: 'চালান', billTo: 'প্রাপক', date: 'তারিখ', dueDate: 'শেষ তারিখ', description: 'বিবরণ', qty: 'পরিমাণ', rate: 'দর', amount: 'টাকা', subtotal: 'উপ-মোট', tax: 'কর', total: 'মোট', notes: 'নোট', terms: 'শর্তাবলী' },
};

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  businessDetails: BusinessDetails;
  clientDetails: ClientDetails;
  items: InvoiceItem[];
  notes: string;
  terms: string;
  taxType: 'CGST_SGST' | 'IGST';
  status?: InvoiceStatus;
  amountPaid?: number;
  linkedCreditNotes?: string[];
  currency?: CurrencyCode;
}

// ── Delivery Challans ──
export type ChallanStatus = 'draft' | 'delivered' | 'converted';

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  date: string;
  businessDetails: BusinessDetails;
  clientDetails: ClientDetails;
  items: InvoiceItem[];
  vehicleNumber: string;
  transportMode: string;
  notes: string;
  status: ChallanStatus;
  convertedInvoiceId?: string;
}

// ── Estimates ──
export interface Estimate {
  id: string;
  estimateNumber: string;
  date: string;
  validUntil: string;
  businessDetails: BusinessDetails;
  clientDetails: ClientDetails;
  items: InvoiceItem[];
  notes: string;
  terms: string;
  taxType: 'CGST_SGST' | 'IGST';
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  convertedInvoiceId?: string;
}

// ── Expenses ──
export type ExpenseCategory = 'Rent' | 'Supplies' | 'Travel' | 'Utilities' | 'Salary' | 'Marketing' | 'Software' | 'Food' | 'Other';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Other';
}

// ── Credit Notes ──
export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  date: string;
  linkedInvoiceId: string;
  linkedInvoiceNumber: string;
  businessDetails: BusinessDetails;
  clientDetails: ClientDetails;
  items: InvoiceItem[];
  reason: string;
  taxType: 'CGST_SGST' | 'IGST';
}

// ── Purchase Orders ──
export type POStatus = 'draft' | 'sent' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  expectedDate: string;
  supplierName: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierGstin: string;
  items: InvoiceItem[];
  notes: string;
  status: POStatus;
  taxType: 'CGST_SGST' | 'IGST';
}

// ── Recurring Invoices ──
export interface RecurringTemplate {
  id: string;
  name: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  clientDetails: ClientDetails;
  items: InvoiceItem[];
  notes: string;
  terms: string;
  taxType: 'CGST_SGST' | 'IGST';
  nextDueDate: string;
  isActive: boolean;
}

// ── Saved Items (with stock) ──
export interface SavedItem {
  id: string;
  name: string;
  hsn: string;
  rate: number;
  gstPercent: number;
  stock?: number;
  lowStockAlert?: number;
  barcode?: string;
}

export interface SavedClient extends ClientDetails {
  id: string;
}

export interface AppConfig {
  theme: 'light' | 'dark';
  colorTheme?: 'sunset' | 'monochrome' | 'fintech' | 'classic' | 'cyberpunk';
  defaultTheme?: 'minimal' | 'corporate' | 'cyberpunk';
  defaultCurrency?: CurrencyCode;
  defaultLanguage?: LanguageCode;
  lastInvoiceNumber: number;
  lastEstimateNumber: number;
  lastCreditNoteNumber: number;
  lastPONumber: number;
  lastChallanNumber: number;
  savedBusinessDetails: BusinessDetails | null;
  savedItems: SavedItem[];
  savedClients: SavedClient[];
}
