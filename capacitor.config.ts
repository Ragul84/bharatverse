import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  /**
   * BharatVerse - Mobile App Configuration
   * Capacitor wraps the Vite web build into a native Android/iOS app.
   *
   * Build steps:
   *   1. npm run build          (Vite production build -> dist/)
   *   2. npx cap sync android   (copy web assets to Android project)
   *   3. npx cap open android   (open in Android Studio for APK build)
   */
  appId: 'in.bharatverse.app',
  appName: 'BharatVerse',
  webDir: 'dist',
  server: {
    // In development, point to the Vite dev server for live reload.
    // Comment out for production builds.
    url: 'http://localhost:5173',
    cleartext: true, // allow http in dev; HTTPS only in production
  },
  android: {
    // Minimum Android SDK 26 (Android 8.0) - covers 95%+ of Indian market
    minWebViewVersion: 60,
    // Disable input auto-zoom (font-size 16px enforced in CSS already)
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#1a0a2e',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    // Push Notifications (Firebase FCM) - for daily streak reminders
    // Configure google-services.json in android/ after `npx cap add android`
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
