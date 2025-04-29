module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-modules-commonjs',
      // Dotenv'i şimdilik yorum satırına alalım, uygulamanın çalışmasını engelliyor
      // ['module:react-native-dotenv', {
      //   moduleName: '@env',
      //   path: '.env',
      //   blacklist: null,
      //   whitelist: null,
      //   safe: false,
      //   allowUndefined: true
      // }],
      ['module-resolver', {
        root: ['.'],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        alias: {
          '@': '.'
        }
      }],
      'react-native-reanimated/plugin',
    ],
  };
}; 