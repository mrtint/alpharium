/**
 * release 서명 설정을 선언으로 넣는다 (006 FR-003, contracts/release-build.md §2).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 `android/app/build.gradle`을 직접 고치지 않는가**
 *
 * `.gitignore` 16행이 `/android`를 무시하고 `git ls-files android/`가 비어 있다 —
 * 추적되지 않는 생성물이다. 직접 고치면:
 *
 *  - 저장소에 남지 않아 다음 사람이 재현할 수 없다(FR-006)
 *  - `npx expo prebuild --platform android --clean`에 **지워진다**
 *
 * **004에서 같은 성질의 사고가 있었다** — `expo run:android`가 prebuild를 건너뛰어
 * `READ_MEDIA_IMAGES`가 빠진 APK가 설치됐다. 네이티브 설정은 선언으로 남겨야 하며,
 * 서명은 매니페스트보다 잃었을 때의 비용이 크다(키가 바뀌면 덮어 설치가 끊기고
 * 사용자의 일기가 함께 사라진다).
 *
 * **이 파일이 아는 것과 모르는 것**:
 *  - 안다: 키스토어 **경로**와 **별칭** (비밀이 아니다)
 *  - 모른다: **비밀번호** — gradle이 빌드 시점에 읽는다(FR-004, SC-005)
 *
 * 비밀번호를 여기 적으면 저장소에 커밋되며 그것이 SC-005 정면 위반이다.
 *
 * **값이 없으면 아무것도 하지 않는다.** 키를 아직 만들지 않은 사람도 debug 빌드로
 * 개발할 수 있어야 하고, 조용히 debug 키로 서명하는 것과 **선언이 없는 것**은 다르다 —
 * 후자는 `apksigner`로 확인하면 드러난다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { withAppBuildGradle } = require("@expo/config-plugins");

/** gradle이 비밀번호를 읽어 올 속성 이름. 값은 저장소 밖에 있다 */
const STORE_PASSWORD_PROPERTY = "ALPHARIUM_STORE_PASSWORD";
const KEY_PASSWORD_PROPERTY = "ALPHARIUM_KEY_PASSWORD";

/**
 * release `signingConfig`를 만들고 `buildTypes.release`가 그것을 쓰게 한다.
 *
 * **Expo 템플릿의 기본값은 `signingConfigs.debug`다** — 그 줄이 그대로 있으면
 * release가 debug 키로 서명되고, 나중에 제 키로 바꾸는 순간 덮어 설치가 끊긴다.
 */
function addReleaseSigning(contents, { keystorePath, keyAlias }) {
  // 이미 넣었으면 다시 넣지 않는다. prebuild가 여러 번 돌 수 있다.
  if (contents.includes("alphariumRelease")) return contents;

  const signingConfig = `
        alphariumRelease {
            // **경로와 별칭만 여기 있다.** 비밀번호는 gradle 속성에서 온다(FR-004).
            storeFile file('${keystorePath}')
            keyAlias '${keyAlias}'
            storePassword project.findProperty('${STORE_PASSWORD_PROPERTY}') ?: ''
            keyPassword project.findProperty('${KEY_PASSWORD_PROPERTY}') ?: ''
        }`;

  // signingConfigs 블록 안에 우리 설정을 더한다.
  let next = contents.replace(/(signingConfigs\s*\{)/, `$1${signingConfig}`);

  // release가 debug 키를 쓰던 것을 우리 것으로 바꾼다.
  // **주석의 "Caution!"도 함께 지운다** — 더 이상 해당하지 않는 경고가 남으면
  // 다음 사람이 아직 debug 키인 줄 안다.
  next = next.replace(
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
    "$1signingConfig signingConfigs.alphariumRelease",
  );

  return next;
}

/**
 * @param {object} config
 * @param {{ keystorePath?: string, keyAlias?: string }} options
 */
module.exports = function withReleaseSigning(config, options = {}) {
  const { keystorePath, keyAlias } = options;

  // **선언이 없으면 손대지 않는다.** 조용히 debug 키를 쓰는 것과는 다르며,
  // 그 경우 release는 템플릿 기본값 그대로여서 apksigner로 확인하면 드러난다.
  if (keystorePath === undefined || keyAlias === undefined) return config;

  return withAppBuildGradle(config, (gradleConfig) => {
    gradleConfig.modResults.contents = addReleaseSigning(gradleConfig.modResults.contents, {
      keystorePath,
      keyAlias,
    });
    return gradleConfig;
  });
};

// 테스트가 순수 함수만 검증할 수 있도록 함께 내보낸다(기기·gradle 없이 돈다).
module.exports.addReleaseSigning = addReleaseSigning;
