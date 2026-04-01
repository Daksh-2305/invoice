import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(val: string): string {
  if (!val) return '';
  // If user starts typing a number directly (no +), prepend +91
  if (val.match(/^[0-9]/)) {
    if (val.startsWith('91') && val.length > 2) {
      return '+91 ' + val.substring(2).trim();
    }
    return '+91 ' + val;
  }
  return val;
}

export const textToBase64 = (text: string, type: string = 'text/plain'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([text], { type });
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64 || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const downloadWebFile = (content: string, fileName: string, type: string = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};
