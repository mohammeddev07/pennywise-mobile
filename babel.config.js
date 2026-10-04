module.exports = function (api) {
  const isTest = api.env("test");
  return {
    presets: [
      "babel-preset-expo",
      // NativeWind v4 uses a Babel PRESET (not a plugin)
      "nativewind/babel",
    ],
    plugins: [
      ...(isTest ? ["@babel/plugin-transform-dynamic-import"] : []),
      // Reanimated plugin MUST be last
      "react-native-reanimated/plugin",
    ],
  };
};
