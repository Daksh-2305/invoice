import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.billsaathi.app',
  appName: 'BillSaathi',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
