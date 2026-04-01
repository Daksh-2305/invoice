import { useState, useEffect } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import type { BusinessDetails } from '../types';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { formatPhoneNumber } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Building2, Save, CheckCircle, Mail, Phone, MapPin, Hash, CreditCard, Pencil } from 'lucide-react';

export default function BusinessProfile() {
  const { config, updateConfig } = useInvoice();
  const [details, setDetails] = useState<BusinessDetails>(
    config.savedBusinessDetails || {
      name: '',
      address: '',
      gstin: '',
      email: '',
      phone: '',
      upiId: '',
    }
  );
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(!config.savedBusinessDetails?.name);

  // Sync if config changes externally
  useEffect(() => {
    if (config.savedBusinessDetails) {
      setDetails(config.savedBusinessDetails);
    }
  }, [config.savedBusinessDetails]);

  const handleChange = (field: keyof BusinessDetails, value: string) => {
    setDetails(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    if (!details.name.trim()) return;
    updateConfig({ savedBusinessDetails: details });
    setSaved(true);
    setIsEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-3xl mx-auto pb-12">
      <header className="flex justify-between items-center sm:flex-row flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            Business Profile
          </h1>
          <p className="text-muted-foreground mt-2 ml-[52px]">
            Manage your business details — this info appears on all invoices
          </p>
        </div>
        <div className="flex gap-3">
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={!details.name.trim()}>
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          )}
        </div>
      </header>

      {/* Success Toast */}
      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm font-medium animate-in slide-in-from-top-2 fade-in duration-300">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          Business profile saved successfully! Changes will reflect on future invoices.
        </div>
      )}

      {/* Profile Card - View Mode */}
      {!isEditing ? (
        <Card className="overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-primary/60 to-accent" />
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-5 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{details.name || '—'}</h2>
                {details.gstin && (
                  <p className="text-sm text-muted-foreground mt-1 font-mono">GSTIN: {details.gstin}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
                <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</p>
                  <p className="text-foreground font-medium mt-0.5">{details.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
                <Phone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</p>
                  <p className="text-foreground font-medium mt-0.5">{details.phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 md:col-span-2">
                <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</p>
                  <p className="text-foreground font-medium mt-0.5">{details.address || '—'}</p>
                </div>
              </div>
              {details.upiId && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
                  <CreditCard className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">UPI ID</p>
                    <p className="text-foreground font-medium mt-0.5">{details.upiId}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Edit Mode */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Business Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Input
                label="Business Name *"
                value={details.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Acme Corporation Pvt. Ltd."
              />
              <Building2 className="absolute right-3 top-[34px] w-4 h-4 text-muted-foreground/40 pointer-events-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  label="Email"
                  type="email"
                  value={details.email}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder="contact@acme.com"
                />
                <Mail className="absolute right-3 top-[34px] w-4 h-4 text-muted-foreground/40 pointer-events-none" />
              </div>
              <div className="relative">
                <Input
                  label="Phone"
                  value={details.phone}
                  onChange={e => handleChange('phone', formatPhoneNumber(e.target.value))}
                  placeholder="+91 9999999999"
                />
                <Phone className="absolute right-3 top-[34px] w-4 h-4 text-muted-foreground/40 pointer-events-none" />
              </div>
            </div>

            <div className="relative">
              <Input
                label="Address"
                value={details.address}
                onChange={e => handleChange('address', e.target.value)}
                placeholder="123 Business Street, City, State - 123456"
              />
              <MapPin className="absolute right-3 top-[34px] w-4 h-4 text-muted-foreground/40 pointer-events-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  label="GSTIN (Optional)"
                  value={details.gstin}
                  onChange={e => handleChange('gstin', e.target.value)}
                  placeholder="22AAAAA0000A1Z5"
                />
                <Hash className="absolute right-3 top-[34px] w-4 h-4 text-muted-foreground/40 pointer-events-none" />
              </div>
              <div className="relative">
                <Input
                  label="UPI ID (Optional)"
                  value={details.upiId || ''}
                  onChange={e => handleChange('upiId', e.target.value)}
                  placeholder="merchant@upi"
                />
                <CreditCard className="absolute right-3 top-[34px] w-4 h-4 text-muted-foreground/40 pointer-events-none" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={!details.name.trim()} className="flex-1">
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
              {config.savedBusinessDetails?.name && (
                <Button variant="outline" onClick={() => {
                  setDetails(config.savedBusinessDetails!);
                  setIsEditing(false);
                }}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help text */}
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          💡 These details are automatically applied to every invoice you create
        </p>
      </div>
    </div>
  );
}
