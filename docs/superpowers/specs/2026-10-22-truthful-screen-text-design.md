# 화면 문구를 사실대로 — 설계

로드맵 「화면 문구를 사실대로 — 자동 쓰기 약속·장소 이름·교체/삭제 예고」. 화면이 실제 동작과 다르게 말하거나 결과를 덜 말하는 다섯 자리를 고친다. 동작 변경은 없고 문구와 접근성 라벨, 지원 FAQ 한 항목뿐이다.

## 확정된 문장 (소유자 확정 2026-10-22)

| # | 자리 | 새 문장 |
|---|---|---|
| UX-13 | `download.ts` 슬라이드 3 | 제목 「열면 바로 그날 일기를 써요」 / 본문 「자동으로 쓰기를 켜 두면 쓸 차례에 알림이 오고, 먼저 써 두기도 해요.」 |
| UX-15 | `settings.ts` `placeOnDesc` | 「일기를 쓸 때 다닌 자리의 이름을 참고해요」 |
| UX-15 | `settings.ts` `placeAutoDesc` | 「위치 권한이 있으면 이름을 참고하고, 없으면 비워 둬요」 |
| UX-15 | 홈 장소 칸 접근성 라벨(`MaterialGrid`, 값 줄) | 「사진이 찍힌 자리 N곳」 — 카탈로그 새 영역 `home.material.placesA11y(n)` |
| UX-15 | 지원 FAQ 맨 끝 항목 | 질문 「홈의 장소 수는 무엇인가요?」 / 답 「그날 사진이 찍힌 자리의 수예요. 가까운 곳에서 찍은 사진은 한 자리로 묶어 세고, 위치 정보가 없는 사진은 세지 않아요.」 |
| UX-20 | `home.overwriteConfirm.body` | 「다 쓰면 지금 일기가 새 글로 바뀌어요. 바뀐 뒤에는 되돌릴 수 없어요.」 |
| UX-21 | `settings.ts` `wipeBody` | 「되돌릴 수 없어요. 휴대폰의 사진과 이름·설정은 남아요.」 |
| UX-16 | `home.writing.fallback` | 「쓰고 있어요」 |
| UX-16 | `home.needsAuthor` | 「일기 작성자를 준비해야 해요」 |

## 근거와 경계

- 자동 쓰기는 기본값이 꺼짐(`schedule/settings.ts`)이라 슬라이드 3의 알림·먼저 써 둠은 「켜 두면」 조건 아래에만 둔다. 바이트·퍼센트·시간은 쓰지 않는다(045 FR-006).
- 쓴 날 지면은 장소 이름을 그리지 않고(051), 「켬」은 대표 좌표 하나를 프롬프트 `placeName`으로만 넣는다. 이름이 본문에 실리는지는 모델이 정하므로 「참고해요」로 쓴다. 같은 대화상자의 `placeNotice`와 겹치지 않는다.
- 장소 수는 `tracePlaces`가 사용 가능한 좌표만 묶어 센 값이다. 묶는 거리 상수(100m)는 짐작 값이라 FAQ에 적지 않는다. 홈 격자 아래 설명 줄은 두지 않는다(053 보드 1d ④).
- 「되돌릴 수 없어요」는 다시 쓰기의 취소·실패 경로에서도 거짓이 아니도록 「바뀐 뒤에는」 조건을 단다(050 OW8·071).
- 지우기는 `vision-cache` 사본만 지운다(`wipe-port.ts`). 사진 원본은 남는다. 모듈은 열거하지 않는다. C9(앱을 지우면)·UX-14(재료 없는 날 낱말)는 이 과제에 넣지 않는다.
- UX-16의 「일기 작성자」는 같은 화면에 「모듈 다시 받기」 버튼이 있어 그대로 두고 어미만 바꾼다.

## 범위

- 카탈로그: `src/i18n/catalogs/ko/{download,settings,home}.ts`. 접근성 라벨은 `MaterialGrid.tsx`가 새 카탈로그 항목을 읽는다.
- 지원 페이지: `site/support/index.html` FAQ 끝에 새 항목만. 「앱을 지우면」 답 문단은 건드리지 않는다(백업 과제 영역). `plugins/`·`app.json`·`site/privacy/`·백업 규칙·모델 경로도 건드리지 않는다.
- 소스 주석이 옛 문구를 인용하는 자리(`WipeConfirmDialog.tsx`, 058 계약 UI5, `download.ts` 머리)를 고친다.

## 테스트

- 062 골든은 다시 쓰지 않는다. 바뀐 문자열은 `CHANGED_AFTER_GOLDEN`(literal + outputs), 새 영역은 `ADDED_AFTER_GOLDEN`에 올린다.
- 함께 깨지는 단언을 고친다: `home-text.test.ts` TXT1·`overwrite-confirm.test.tsx` OW1·`settings-this-phone.test.tsx` TX1·UI5·`place-name-dialog.test.tsx`·`settings-screen.test.tsx`·`site-pages.test.ts` S9(FAQ 다섯 → 여섯)·`writing-in-place`·`writing-monologue-rotation`·`diary-home`.
- 새 계약: 장소 칸 접근성 라벨은 셀 컨테이너가 아니라 값 줄에 달린다. 슬라이드 3 본문이 「켜 두면」 조건을 포함한다.
- 위반 주입: 슬라이드 3에 조건 없는 알림 약속을 되돌려 넣어 보고 테스트가 잡는지 확인한다.
- 실기기(SM-S901N, dev): 슬라이드 3, 설정 장소 대화상자, 다시 쓰기·지우기 대화상자, 지운 뒤 모델과 사진 수 동일, 장소 칸 TalkBack 발화.

## 위험

- 슬라이드 3은 매력을 파는 자리인데 사실대로 쓰면 약해진다. 「되돌릴 수 없어요」는 다시 쓰기를 무겁게 느끼게 할 수 있다. UX-14와 같은 화면을 두 번 고치게 될 수 있다.
