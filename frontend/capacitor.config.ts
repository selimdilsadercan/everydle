import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.everydle.app',
  appName: 'Everydle',
  webDir: 'out',
  plugins: {
    AdMob: {
      androidAppId: 'ca-app-pub-8702057253982242~2684989536', 
      iosAppId: 'ca-app-pub-8702057253982242~2684989536', 
    },
  },
};

export default config;
