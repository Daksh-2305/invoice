import { useState } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import type { SavedClient } from '../types';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Plus, Trash2, Edit2, Users } from 'lucide-react';
import { formatPhoneNumber } from '../lib/utils';

export default function Clients() {
  const { config, saveClient, deleteClient } = useInvoice();
  
  const [editingClient, setEditingClient] = useState<SavedClient | null>(null);

  const [formData, setFormData] = useState<Omit<SavedClient, 'id'>>({
    name: '',
    address: '',
    gstin: '',
    email: '',
    phone: '',
  });

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert("Client Name is required");
      return;
    }
    
    saveClient({
      id: editingClient ? editingClient.id : crypto.randomUUID(),
      ...formData,
    });
    
    setEditingClient(null);
    setFormData({ name: '', address: '', gstin: '', email: '', phone: '' });
  };

  const handleEdit = (client: SavedClient) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      address: client.address,
      gstin: client.gstin,
      email: client.email,
      phone: client.phone,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      deleteClient(id);
      if (editingClient?.id === id) {
        setEditingClient(null);
        setFormData({ name: '', address: '', gstin: '', email: '', phone: '' });
      }
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Clients Database</h1>
        <p className="text-muted-foreground mt-2">Manage your customers for quick auto-fill.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">{editingClient ? 'Edit Client' : 'Add New Client'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input 
                label="Client Name *" 
                placeholder="Acme Corp / John Doe" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
              <Input 
                label="Email" 
                type="email"
                placeholder="contact@acme.com" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
              />
              <Input 
                label="Phone" 
                placeholder="+91 9999999999" 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: formatPhoneNumber(e.target.value)})} 
              />
              <Input 
                label="GSTIN (Optional)" 
                placeholder="22AAAAA0000A1Z5" 
                value={formData.gstin} 
                onChange={(e) => setFormData({...formData, gstin: e.target.value})} 
              />
              <Input 
                label="Address" 
                placeholder="123 Business Street" 
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})} 
              />
              <div className="pt-2 flex gap-2">
                <Button className="flex-1" size="sm" onClick={handleSave}>
                  <Plus className="w-4 h-4 mr-2" />
                  {editingClient ? 'Update Client' : 'Save Client'}
                </Button>
                {editingClient && (
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditingClient(null);
                    setFormData({ name: '', address: '', gstin: '', email: '', phone: '' });
                  }}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Saved Clients ({config.savedClients?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {config.savedClients && config.savedClients.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-[13px] text-left">
                    <thead className="bg-muted text-muted-foreground uppercase text-[11px]">
                      <tr>
                        <th className="py-2 px-3 font-medium">Client Details</th>
                        <th className="py-2 px-3 font-medium">Contact</th>
                        <th className="py-2 px-3 font-medium">GSTIN</th>
                        <th className="py-2 px-3 w-[100px] text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {config.savedClients.map((client) => (
                        <tr key={client.id} className="hover:bg-muted/50 transition-colors">
                          <td className="py-2 px-3">
                            <div className="font-medium text-foreground">{client.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={client.address}>{client.address || 'No address'}</div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="text-[13px]">{client.phone || '-'}</div>
                            <div className="text-[11px] text-muted-foreground">{client.email || '-'}</div>
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px]">{client.gstin || '-'}</td>
                          <td className="py-1 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleEdit(client)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(client.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mb-3 text-muted-foreground/50" />
                  <p className="text-lg font-medium text-foreground">No clients saved yet</p>
                  <p className="text-sm mt-1 max-w-sm">Save your frequent customers here to automatically fill their details in new invoices.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
