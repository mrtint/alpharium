/**
 * 설정 「정보 · 버전」 행의 값 (055 FR-028, data-model VersionText).
 *
 * **설치된 바이너리의 값**을 받아 「1.0.0 (9)」 꼴로 옮긴다 — 앱 버전(versionName)과 빌드 번호(versionCode).
 * 값은 조립부가 `expo-application`에서 읽어 넘긴다(research R5). **읽지 못한 값을 지어내지 않는다**(원칙 V) — 빌드
 * 번호가 없으면 버전만, 버전이 없으면 `null`(행 값을 비운다).
 */
export function formatVersion(name: string | null, build: string | null): string | null {
  if (name === null || name === "") return null;
  if (build === null || build === "") return name;
  return `${name} (${build})`;
}
