import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CapacitorConfig } from '@capacitor/cli';

const hasFirebase = existsSync(resolve(process.cwd(), 'android/app/google-services.json'));

const config: CapacitorConfig = {
  appId: 'app.toodle',
  appName: 'Toodle',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  ...(hasFirebase ? {} : { includePlugins: ['@capacitor/app'] }),
  plugins: {
    PushNotifications: {
      presentationOptions: [],
    },
  },
};

export default config;
