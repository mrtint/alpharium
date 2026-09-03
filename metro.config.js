// 032 — NativeWind v4 Metro 통합(research.md R2). `babel.config.js`와 짝이며,
// 이전에 `metro.config.js`가 없어 Expo 기본값에 의존했다.
//
// `withNativeWind(config, { input })` — `global.css`(저장소 루트)를 Metro
// 트랜스폼 파이프라인에 넣어 `@tailwind base/components/utilities`가 실리게 한다.
//
// ⚠️ 이 파일을 추가한 뒤 첫 실행은 `npx expo start --clear`로 Metro 캐시를
// 비운다 — 안 그러면 "Loading from localhost:8081..."에 영구히 머문다
// (AGENTS.md, 오류 없이 영영 로딩 중이라 원인을 가리키지 않는다).
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
