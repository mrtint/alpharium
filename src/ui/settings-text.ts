/**
 * 설정 화면(055, 보드 `6a`·`6c`)의 문구.
 *
 * 계약: specs/055-settings-entry-frame/spec.md FR-031, contracts/settings-stack.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **보드 「KO 문자열 — 설정 · 개발자 (6c–6l)」 표의 원문이다**(C4). 키 이름은 보드 키를 따른다 —
 * `settings-screen.test.tsx`가 글자 단위로 잠근다. 이 구역에는 EN이 없다.
 *
 * 보드 표에 없는 셋(`save`·`backToSettings`·`redownload`)은 보드의 다른 자리에서 온 낱말이다 —
 * `save`는 `6c` ② 메모의 「저장 버튼」, `backToSettings`는 `6e`·`6h` 마크업의 「‹ 설정」, `redownload`는
 * `dev.redownload` 「모듈 다시 받기」(055 Clarification).
 *
 * 056 — 「매일 쓰는 시각」·「장소 이름으로 보기」 행과 두 대화상자(보드 `6c` ③·`6f`·`6l`)의 정적 문구. 시를 끼워 넣는
 * 문장(행 값·미리보기·시간대 줄)의 틀은 `src/app/target-hour.ts`가 갖는다(`src/app/`이 `src/ui/`를 import하지 않는다).
 * 보드의 `time.save` 「저장」은 쓰지 않는다 — 두 대화상자 모두 칸을 누르면 바로 적용된다(056 Clarification Q4).
 * 보드 표에 없는 `placeNotice`는 017 FR-006의 지도 고지를 해요체로 옮긴 것이다(056 FR-026).
 *
 * 057 — 사진 행의 건너뜀 보조 줄 두 문장(보드 `perm.photos.skippedYesterday`·`perm.photos.skippedOn`)은 문장 틀을 쓰는
 * `src/app/skipped-line.ts`가 원문을 갖고 여기서는 그것을 가리킨다(한 곳에만 둔다).
 *
 * 058 — 「이 휴대폰」 묶음과 일기 모두 지우기 확인(보드 `6c` ⑥, 표 `settings.group.device`·`device.*`·`wipe.*`). 메모 원문
 * (「되돌릴 수 없어요.」)과 표(`wipe.body`)가 다르면 표가 원문이다(분해 설계 §4.3). `wipeBlocked`는 보드에 없다(research R10).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { lazyText, text } from "../i18n/current";

/** 062 — 문구는 한국어 카탈로그 `src/i18n/catalogs/ko/settings.ts`로 옮겼다. 이름은 그대로 두고 읽는 순간 카탈로그에서 꺼낸다 */
export const SETTINGS_TEXT = lazyText((c) => c.settings);

/** 058 — 보드 `wipe.title` 「일기 {n}편을 모두 지울까요?」. 편수는 숫자 그대로(천 단위 구분 없음, FR-010) */
export function wipeTitle(n: number): string {
  return text().settings.wipeTitle(n);
}

/** 진입점·머리의 ‹ 글리프. 문구와 따로 그린다(보드 마크업이 ‹ 를 22, 글자를 15로 다르게 그린다). */
export const BACK_CHEVRON = "‹";
