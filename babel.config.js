module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // react-native-worklets/plugin MUST be last — required by Reanimated 4
    // and by expo-router on RN 0.85.
    plugins: ["react-native-worklets/plugin"],
  };
};
