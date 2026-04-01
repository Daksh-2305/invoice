import { useState } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import type { BusinessDetails } from '../types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { ArrowRight, Building2, Mail, Phone, MapPin, CreditCard, Hash } from 'lucide-react';
import { formatPhoneNumber } from '../lib/utils';

export function BusinessRegistration() {
  const { config, updateConfig } = useInvoice();
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<BusinessDetails>({
    name: '',
    address: '',
    gstin: '',
    email: '',
    phone: '',
    upiId: '',
  });
  const [error, setError] = useState('');

  // Don't show if already registered
  if (config.savedBusinessDetails && config.savedBusinessDetails.name.trim()) {
    return null;
  }

  const handleChange = (field: keyof BusinessDetails, value: string) => {
    setDetails(prev => ({ ...prev, [field]: value }));
    if (field === 'name' && error) setError('');
  };

  const handleSubmit = () => {
    if (!details.name.trim()) {
      setError('Business name is required to continue');
      return;
    }
    updateConfig({ savedBusinessDetails: details });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/50 via-primary/10 to-accent/20" />
      <div className="absolute inset-0 backdrop-blur-3xl" />
      
      {/* Floating orbs */}
      <div className="absolute top-[10%] left-[15%] w-72 h-72 rounded-full bg-white/10 blur-[80px] animate-pulse" />
      <div className="absolute bottom-[15%] right-[10%] w-96 h-96 rounded-full bg-accent/20 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-[50%] right-[30%] w-48 h-48 rounded-full bg-primary-foreground/10 blur-[60px] animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 w-full max-w-xl mx-4 my-8">
        {step === 0 ? (
          /* Welcome Screen */
          <div className="text-center text-white space-y-8 animate-in fade-in duration-700">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-primary shadow-2xl mb-2 shadow-primary/30 relative overflow-hidden transform transition-all hover:scale-105">
              <div className="absolute inset-0 bg-white/10 rounded-3xl" />
              <span className="relative text-white font-black text-5xl leading-none" style={{fontFamily:'Georgia,serif'}}>Bs</span>
            </div>
            <div>
              <h1 className="text-5xl font-extrabold tracking-tight mb-4">
                Welcome to BillSaathi
              </h1>
              <p className="text-xl text-white/80 max-w-md mx-auto leading-relaxed">
                Create professional invoices in seconds. Let's set up your business profile first.
              </p>
            </div>
            <Button
              onClick={() => setStep(1)}
              className="!bg-primary !text-primary-foreground hover:brightness-110 !px-8 !py-3 !text-lg !font-bold !rounded-2xl !shadow-2xl !shadow-primary/20 transition-transform hover:scale-105"
            >
              Let's Get Started <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        ) : (
          /* Registration Form */
          <div className="bg-white/95 dark:bg-card/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/20 p-8 md:p-10 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Your Business Profile</h2>
              <p className="text-muted-foreground mt-1">This info will appear on all your invoices</p>
            </div>

            <div className="space-y-5">
              <div className="relative">
                <Input
                  label="Business Name *"
                  value={details.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="Acme Corporation Pvt. Ltd."
                />
                {error && (
                  <p className="text-destructive text-sm mt-1 font-medium animate-in fade-in duration-200">{error}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Input
                    label="Email"
                    type="email"
                    value={details.email}
                    onChange={e => handleChange('email', e.target.value)}
                    placeholder="contact@acme.com"
                  />
                  <Mail className="absolute right-3 top-[38px] w-4 h-4 text-muted-foreground/40 pointer-events-none" />
                </div>
                <div className="relative">
                  <Input
                    label="Phone Number"
                    value={details.phone}
                    onChange={e => handleChange('phone', formatPhoneNumber(e.target.value))}
                    placeholder="+91 98765 43210"
                  />
                  <Phone className="absolute right-3 top-[38px] w-4 h-4 text-muted-foreground/40 pointer-events-none" />
                </div>
              </div>

              <div className="relative">
                <Input
                  label="Address"
                  value={details.address}
                  onChange={e => handleChange('address', e.target.value)}
                  placeholder="123 Business Street, City, State - 123456"
                />
                <MapPin className="absolute right-3 top-[38px] w-4 h-4 text-muted-foreground/40 pointer-events-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Input
                    label="GSTIN (Optional)"
                    value={details.gstin}
                    onChange={e => handleChange('gstin', e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                  />
                  <Hash className="absolute right-3 top-[38px] w-4 h-4 text-muted-foreground/40 pointer-events-none" />
                </div>
                <div className="relative">
                  <Input
                    label="UPI ID (Optional)"
                    value={details.upiId}
                    onChange={e => handleChange('upiId', e.target.value)}
                    placeholder="merchant@upi"
                  />
                  <CreditCard className="absolute right-3 top-[38px] w-4 h-4 text-muted-foreground/40 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Button
                onClick={handleSubmit}
                className="w-full !py-3 !text-base !font-bold !rounded-2xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                Start Creating Invoices
              </Button>
              <p className="text-xs text-muted-foreground">
                You can always edit these details later from the Business Profile tab
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
