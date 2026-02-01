module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      "babel-preset-expo",
      // NativeWind v4 uses a Babel PRESET (not a plugin)
      "nativewind/babel",
    ],
    plugins: [
      // Reanimated plugin MUST be last
      "react-native-reanimated/plugin",
    ],
  };
};
