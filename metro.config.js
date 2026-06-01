const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Expo disables inline requires by default; Reanimated 4 / Worklets need them
// so worklets init runs before other module exports (see reanimated#8904).
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
  },
});

// On web, react-native-worklets crashes at init() — it tries to verify the
// babel worklet transformation in dev mode, and to serialize worklet
// descriptors in both modes.  Neither is meaningful on web (single JS thread).
// Replace the entire package with a no-op stub for web builds only.
const workletsWebStub = path.resolve(
  __dirname,
  'src/mocks/react-native-worklets-web.js',
);
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-worklets' && platform === 'web') {
    return { filePath: workletsWebStub, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = wrapWithReanimatedMetroConfig(config);
