module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            // This is the magic line that fixes the icons on web
            "react-native-vector-icons": "@expo/vector-icons",
          },
        },
      ],
    ],
  };
};
