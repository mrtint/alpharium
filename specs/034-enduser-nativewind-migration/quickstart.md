# Quickstart: 엔드유저 화면 NativeWind 이관 검증

**Feature**: 034-enduser-nativewind-migration
**Date**: 2026-09-07

이관이 "표현만 바꿨다"를 증명하는 실행 가이드. 순서대로 돌린다.

## 전제

- 브랜치 `034-enduser-nativewind-migration` 체크아웃 (`git branch --show-current`로 눈으로 확인).
- 4개 화면 + `App.tsx` 1곳 이관 완료, `enduser-screen-migration.test.tsx` 작성 완료.

## 1. 기존 계약 테스트 무수정 통과 (1차 계약 — SC-002)

```
git diff --stat -- __tests__/ui/author-picker.test.tsx __tests__/ui/build-error.test.tsx __tests__/ui/overwrite-confirm.test.tsx __tests__/ui/permissions-section.test.tsx
```
→ **출력이 비어 있어야 한다** (한 글자도 안 바뀜).

```
npm run test:ui -- author-picker build-error overwrite-confirm permissions-section
```
→ 4개 스위트 전부 GREEN.

## 2. 새 계약 테스트 (이관 불변식 — SC-003·SC-011)

```
npm run test:ui -- enduser-screen-migration
```
→ ES1~ES14 GREEN. 특히:
- ES7: 4파일에 `#rrggbb` 0개
- ES10: `AuthorPicker`가 `SelectRow` 미사용
- ES11: `OverwriteConfirmScreen`이 `Button` 사용
- ES13: `PermissionsSection`이 `Card` + `SectionHeader` 사용, `Section` 미사용
- ES14: `PermissionsSection` `section` 스타일에 좌우 padding 없음

## 3. 전체 기기 없는 테스트 + lint (SC-004·SC-005)

```
npm test
npm run lint
```
→ `npm test` 전체 GREEN (jest 두 프로젝트, `jest-projects.test.ts` 파일 수 가드 포함).
→ `npm run lint`: eslint 0 error, `tsc` 0, `scripts/check-constitution.mts` 위반 0, prettier 클린.

**헌법 검사 확인**: `UI_TOUCHES_MODEL`·`UI_TOUCHES_ASSET`·`UI_TOUCHES_PROMPT` 위반 0 (4파일이 모델·프롬프트에 안 닿음).

## 4. 위반 주입으로 방어 확인 (SC-005)

각각 넣고 테스트/lint가 잡는지 확인한 뒤 되돌린다:

| 주입 | 잡는 곳 |
| --- | --- |
| `AuthorPicker.tsx`에 `borderColor: "#ccc"` | `enduser-screen-migration.test.tsx` ES7 |
| `BuildErrorScreen.tsx`에 `import { useColorScheme } from "react-native"` | `dark-mode-no-scheme.test.ts` |
| `OverwriteConfirmScreen.tsx`에 `className="dark:bg-black"` | `dark-mode-no-scheme.test.ts` (dark: variant) |
| `PermissionsSection.tsx`에 `import { roster } from "../models/roster"` | `npm run lint` (`check-constitution.mts` `UI_TOUCHES_MODEL`) |
| `PermissionsSection.tsx` `section`에 `paddingHorizontal: 20` 되살림 | `enduser-screen-migration.test.tsx` ES14 |

## 5. 실기기 Maestro 회귀 (SC-007) — SM-S901N, debug

**Metro (dev 환경)**:
```
EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client --clear
```
**빌드·설치**: `npx expo run:android` (033 세션이 debug 앱을 지웠으면 재설치 + 모델 재배치). 기기 잠금 해제, `adb reverse tcp:8081 tcp:8081`.

**흐름 순서** (`pm clear` 쓰는 것 없음 — `unified-permission-onboarding.yml`은 이 스펙 대상 아님):
```
node scripts/run-device-tests.mjs diary-character-select
node scripts/run-device-tests.mjs writing-flow-simplified
node scripts/run-device-tests.mjs generate-diary
node scripts/run-device-tests.mjs past-day-diary
node scripts/run-device-tests.mjs photo-selection-over-limit
node scripts/run-device-tests.mjs writing-monologue-expansion
node scripts/run-device-tests.mjs model-acquisition
node scripts/run-device-tests.mjs parallel-model-download
node scripts/run-device-tests.mjs skeleton
```
→ 전부 PASS. 깨지면 흐름이 아니라 구현을 고친다 (`testID` 유지 원칙). 흐름이 이미 stale이면 갱신하고 명시적으로 보고 (SC-007 부분 미충족 기록).

**⚠️ `download-conflict.yml`은 026 이후 PASS 불가** (033이 못 박음 — "한 번에 하나"가 풀려 거부가 안 일어남). 이 스펙 회귀 대상에서 제외.

## 6. 실기기 육안 (SC-006·SC-008)

설정 탭:
- [ ] "일기 작성자" 섹션 — 캐릭터 행 테두리·선택 표식이 테라코타(`COLORS.accent`), 배경 아이보리(`COLORS.bg`), 폰트가 목록 화면과 동일. `"작성자"` 표식 문안 그대로.
- [ ] "권한" 섹션 — 5개 권한 행이 각각 흰 카드(`COLORS.surface` + border)로 분리돼 보인다. 머리글 `"권한"`. 상태 문구·`"허용"`/`"설정 열기"`/`"전체 허용"`/`"배터리 예외 설정"`/`"권한 안내 다시 보기"` 버튼 그대로.
- [ ] **좌우 정렬선**: "일기 작성자"·"사진 보기(VisionPicker)"·"장소명(GeocodingSettingToggle)"·"권한" 네 섹션의 좌우 끝이 같은 세로선(화면 끝에서 20px)에 선다 (ES14).
- [ ] 캐릭터 전환·권한 요청 버튼·OS 설정 링크·"권한 안내 다시 보기"·포그라운드 복귀 재조회(설정에서 권한 바꾸고 앱 복귀 → 행 자동 갱신)가 이관 전과 동일하게 동작 (SC-008).

덮어쓰기 확인 화면 (이미 일기 있는 하루에 "일기 쓰기"):
- [ ] 날짜 + `"이 날의 일기가 이미 있다. 덮어쓸지 확인이 필요하다"` + 「취소」(secondary)/「확인」(primary) 버튼. 톤이 목록 화면과 일치. 버튼 누르면 살짝 작아지는 눌림 피드백.

빌드 오류 화면 (재현 어려우면 생략 가능 — 계약 테스트가 잠금):
- [ ] `"이 빌드는 잘못 만들어졌다"` + 설명 문장, 중앙 정렬, 아이보리 배경. 환경 변수 이름·"다시 시도" 문구 없음.

## 7. 완료 조건

- 1~4 전부 GREEN, 5의 9개 흐름 PASS(또는 stale 갱신 후 PASS + 보고), 6의 육안 체크 완료.
- `git diff --stat` 확인: `src/ui/`의 4파일 + `App.tsx` 1곳 + `__tests__/ui/enduser-screen-migration.test.tsx` 신규. `src/diary/`·`src/models/`·`src/inference/`·`src/signals/`·`src/vision/`·`src/schedule/`·`src/onboarding/` 0줄 (SC-009).
- `.maestro/`의 `FLOWS` 배열 길이 불변 (SC-010).
- release 재확인 생략 (새 네이티브 모듈 0 — 012 기준, FR-021).
- PR로 머지 (main 직접 금지 — FR-022).
