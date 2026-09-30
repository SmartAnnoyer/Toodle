import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.toodle',
  appName: 'Toodle',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
