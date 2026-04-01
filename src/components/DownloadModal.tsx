import { FileOpener } from '@capacitor-community/file-opener';
import { Share } from '@capacitor/share';
import { CheckCircle2, FileText, Share2, ExternalLink, X } from 'lucide-react';
import { Button } from './ui/Button';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileUri: string;
}

export function DownloadModal({ isOpen, onClose, fileName, fileUri }: DownloadModalProps) {
  if (!isOpen) return null;

  const handleOpenFile = async () => {
    try {
      await FileOpener.open({
        filePath: fileUri,
      });
    } catch (e) {
      console.error('Error opening file', e);
      alert('Could not open file automatically. Please find it in your Documents folder.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: fileName,
        text: 'Invoice from BillSaathi',
        url: fileUri,
      });
    } catch (e) {
      console.error('Error sharing file', e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border animate-in zoom-in-95 duration-300">
        <div className="p-1 flex justify-end">
           <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-4 h-4" />
           </Button>
        </div>
        
        <div className="px-6 pb-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-2">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xl font-bold tracking-tight">Invoice Saved!</h3>
            <p className="text-sm text-muted-foreground">Your invoice is ready and saved securely to your device.</p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50 border border-border text-left">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
               <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{fileName}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Documents Folder</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button onClick={handleOpenFile} className="bg-primary hover:bg-primary/90 rounded-2xl">
              <ExternalLink className="w-4 h-4 mr-2" /> Open
            </Button>
            <Button variant="secondary" onClick={handleShare} className="rounded-2xl">
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
          </div>
          
          <p className="text-[10px] text-muted-foreground">
             Android secures files in the private app sandbox. Tap 'Open' to view it, or 'Share' to save to your public Downloads or Google Drive.
          </p>
        </div>
      </div>
    </div>
  );
}
