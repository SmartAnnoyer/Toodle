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
  ...(hasFirebase ? {} : { includePlugins: ['@capacitor/app', '@capacitor/local-notifications'] }),
  plugins: {
    PushNotifications: {
      presentationOptions: [],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_toodle',
      iconColor: '#C084FC',
    },
  },
};

export default config;
