module.exports = function (api) {
    api.cache(true);

    return {
        presets: [
            [
                'babel-preset-expo',
                {
                    unstable_transformImportMeta: true,
                    // PWA-only: disable worklet/reanimated babel transforms.
                    // On web all JS runs in one thread — no UI-thread serialization needed.
                    // The runtime web polyfills in react-native-reanimated handle everything.
                    worklets: false,
                    reanimated: false,
                },
            ],
        ],
    };
};