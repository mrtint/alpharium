/**
 * 개발자 화면 머리글 오른쪽 글자 (059, 보드 `6e`·`6j`).
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md BL1
 *
 * 개발 환경은 「DEV · 1.0.0 (24)」, 배포 환경은 「1.0.0 (24)」(「DEV」 없음). **읽지 못한 버전을 지어내지 않는다**(원칙 V) — 개발 환경은 「DEV」만,
 * 배포 환경은 빈 글자다. 환경 판정은 부르는 쪽이 `showsOnScreen`으로 한다(D2).
 */

export function buildLabelFor({
  devEnvironment,
  versionText,
}: {
  devEnvironment: boolean;
  versionText: string | null;
}): string {
  if (devEnvironment) return versionText === null ? "DEV" : `DEV · ${versionText}`;
  return versionText ?? "";
}
