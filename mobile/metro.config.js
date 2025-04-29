// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Node.js 18 için daha basit bir yapılandırma
config.resolver.sourceExts = ['js', 'jsx', 'ts', 'tsx', 'cjs', 'json', 'mjs'];
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config; 