/**
 * release 서명 plugin 계약 테스트.
 *
 * 계약: specs/006-first-diary-app/contracts/release-build.md §2 (R1·R2·R3)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **gradle을 돌리지 않고 검증한다.** plugin이 하는 일은 `build.gradle` 문자열을
 * 고치는 것뿐이므로 순수 함수로 떼어 놓으면 기기도 빌드도 없이 갈래를 볼 수 있다.
 *
 * **다만 이것이 통과해도 서명이 됐다는 뜻은 아니다**(원칙 V). 실제 확인은
 * `apksigner verify --print-certs`로 하며 그것은 사람이 빌드한 뒤에 한다(T043).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { addReleaseSigning } = require("../../plugins/with-release-signing");

/** Expo 템플릿이 만드는 모양. 실제 `android/app/build.gradle`에서 옮겨 왔다 */
const TEMPLATE = `
android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}
`;

const OPTIONS = { keystorePath: "alpharium.jks", keyAlias: "alpharium" };

describe("addReleaseSigning (R1)", () => {
  it("★ release가 더 이상 debug 키를 쓰지 않는다", () => {
    const out = addReleaseSigning(TEMPLATE, OPTIONS);

    // **이것이 이 plugin의 존재 이유다.** 이 줄이 남아 있으면 나중에 키를 바꿀 때
    // 덮어 설치가 끊기고 사용자의 일기가 사라진다.
    expect(out).toContain("signingConfig signingConfigs.alphariumRelease");
    expect(out).not.toMatch(/release\s*\{[\s\S]*?signingConfig signingConfigs\.debug/);
  });

  it("debug 빌드는 그대로 debug 키를 쓴다", () => {
    const out = addReleaseSigning(TEMPLATE, OPTIONS);

    // 개발 빌드까지 제 키를 요구하면 키 없는 사람이 개발을 못 한다.
    expect(out).toMatch(/debug\s*\{\s*signingConfig signingConfigs\.debug/);
  });

  it("★ 더 이상 맞지 않는 「제 키를 만들라」 주석을 지운다", () => {
    const out = addReleaseSigning(TEMPLATE, OPTIONS);

    // **사실이 아닌 주석은 없느니만 못하다.** 바로 아래 줄이 제 키를 가리키는데
    // 「keystore를 만들어야 한다」가 남아 있으면 다음 사람이 아직 debug 키인 줄 안다.
    expect(out).not.toContain("Caution! In production");
    expect(out).not.toContain("signed-apk-android");
  });

  it("signingConfigs 안에 설정이 생긴다", () => {
    const out = addReleaseSigning(TEMPLATE, OPTIONS);

    expect(out).toContain("alphariumRelease {");
    expect(out).toContain("storeFile file('alpharium.jks')");
    expect(out).toContain("keyAlias 'alpharium'");
  });
});

/**
 * ★ R2 — **비밀번호가 저장소에 들어가지 않는다** (FR-004, SC-005).
 */
describe("★ 비밀번호가 소스에 없다 (R2)", () => {
  it("비밀번호를 문자열로 박지 않는다", () => {
    const out = addReleaseSigning(TEMPLATE, OPTIONS);

    // gradle 속성에서 읽어야 한다. 값이 여기 있으면 커밋된다.
    expect(out).toContain("project.findProperty('ALPHARIUM_STORE_PASSWORD')");
    expect(out).toContain("project.findProperty('ALPHARIUM_KEY_PASSWORD')");
  });

  it("plugin 소스 자체에 비밀번호처럼 보이는 값이 없다", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const source = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "../../plugins/with-release-signing.js"),
      "utf8",
    );

    // debug 키의 관용 비밀번호가 흘러들어 오는 것도 막는다.
    expect(source).not.toMatch(/storePassword\s+'(?!\$)/);
    expect(source).not.toMatch(/keyPassword\s+'(?!\$)/);
  });
});

describe("여러 번 돌아도 안전하다", () => {
  it("두 번 적용해도 설정이 하나다", () => {
    // prebuild가 여러 번 돌 수 있다. 두 번 들어가면 gradle이 깨진다.
    const once = addReleaseSigning(TEMPLATE, OPTIONS);
    const twice = addReleaseSigning(once, OPTIONS);

    expect(twice).toBe(once);
    expect(twice.match(/alphariumRelease \{/g)).toHaveLength(1);
  });
});

/**
 * **키를 아직 만들지 않은 사람도 개발할 수 있어야 한다.**
 *
 * 다만 그 경우 release는 템플릿 기본값(debug 키) 그대로이며, **그것은 `apksigner`로
 * 확인하면 드러난다** — 조용히 통과하는 것이 아니다(원칙 V).
 */
describe("선언이 없으면 손대지 않는다", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withReleaseSigning = require("../../plugins/with-release-signing");

  it("경로가 없으면 config를 그대로 돌려준다", () => {
    const config = { name: "alpharium" };

    expect(withReleaseSigning(config, {})).toBe(config);
    expect(withReleaseSigning(config, { keyAlias: "a" })).toBe(config);
    expect(withReleaseSigning(config, { keystorePath: "a.jks" })).toBe(config);
  });
});
