// Expo SDK 54 공식 ESLint 설정 (flat config)
// 헌법 「플랫폼 제약」에 따라 eslint-config-expo 10.x + ESLint 9.x 조합을 사용한다.
// eslint-config-expo는 55부터 SDK 번호를 따르므로 SDK 54의 대응 버전은 10.0.0이다.
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: ["dist/*", "node_modules/*", ".expo/*", "coverage/*"],
  },
];
