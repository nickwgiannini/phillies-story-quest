/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.nickgiannini.philliesstoryquest',
  appName: 'Phillies Story Quest',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#080e10',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    }
  }
};

module.exports = config;
