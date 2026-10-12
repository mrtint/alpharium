/**
 * 릴리스 번호 올림 (순수 함수, 파일·프로세스를 만지지 않는다).
 *
 * `app.json`의 세 값 — 사람이 보는 버전(`expo.version`), Play 번호(`android.versionCode`), Apple 번호(`ios.buildNumber`) —
 * 를 **늘 함께** 올린다. 2026-10-12에 versionCode만 11로 올려 내보냈더니 버전이 1.0.0 그대로라 기기 설정의 「버전」으로는
 * 새 빌드가 깔렸는지 가를 수 없었다.
 *
 * 파일 전체를 `JSON.stringify`로 다시 쓰지 않는다 — `app.json`의 손 서식(한 줄 배열 등)이 바뀌어 diff가 커진다. 세 줄만
 * 글자로 바꾸고, 결과를 다시 파싱해 값이 맞는지 확인한다. 키가 없거나 두 번 나오면 짐작하지 않고 던진다.
 */

export type BumpLevel = "major" | "minor" | "patch";

export type ReleaseNumbers = { version: string; versionCode: number; buildNumber: string };

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function bumpSemver(version: string, level: BumpLevel): string {
  const m = SEMVER.exec(version);
  if (!m) throw new Error(`expo.version이 x.y.z 꼴이 아니다: ${version}`);
  const [major, minor, patch] = m.slice(1).map(Number);
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** `"key": <값>` 한 곳을 바꾼다. 정확히 한 번 나와야 한다 */
function replaceOnce(text: string, key: string, valuePattern: string, next: string): string {
  const re = new RegExp(`("${key}"\\s*:\\s*)${valuePattern}`, "g");
  const hits = text.match(re)?.length ?? 0;
  if (hits !== 1) throw new Error(`app.json에서 "${key}"가 ${hits}번 나온다 (정확히 1번이어야 한다)`);
  return text.replace(re, `$1${next}`);
}

function readNumbers(text: string): ReleaseNumbers {
  const expo = JSON.parse(text).expo ?? {};
  return {
    version: expo.version,
    versionCode: expo.android?.versionCode,
    buildNumber: expo.ios?.buildNumber,
  };
}

export function bumpAppJson(
  text: string,
  level: BumpLevel,
): { text: string; before: ReleaseNumbers; after: ReleaseNumbers } {
  const before = readNumbers(text);
  if (typeof before.version !== "string") throw new Error("app.json에 expo.version이 없다");
  if (!Number.isInteger(before.versionCode)) throw new Error("app.json의 expo.android.versionCode가 정수가 아니다");
  if (typeof before.buildNumber !== "string" || !/^\d+$/.test(before.buildNumber)) {
    throw new Error("app.json의 expo.ios.buildNumber가 숫자 문자열이 아니다");
  }

  const after: ReleaseNumbers = {
    version: bumpSemver(before.version, level),
    versionCode: before.versionCode + 1,
    buildNumber: String(Number(before.buildNumber) + 1),
  };

  let next = replaceOnce(text, "version", '"[^"]*"', `"${after.version}"`);
  next = replaceOnce(next, "versionCode", "\\d+", String(after.versionCode));
  next = replaceOnce(next, "buildNumber", '"[^"]*"', `"${after.buildNumber}"`);

  const check = readNumbers(next);
  if (JSON.stringify(check) !== JSON.stringify(after)) {
    throw new Error(`바꾼 뒤 값이 기대와 다르다: ${JSON.stringify(check)}`);
  }
  return { text: next, before, after };
}
