// Expo SDK 57 공식 ESLint 설정 (flat config)
// eslint-config-expo는 SDK 55부터 SDK 번호를 따르므로 SDK 57의 대응 버전은 57.x다.
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: ["dist/*", "node_modules/*", ".expo/*", "coverage/*"],
  },
];
