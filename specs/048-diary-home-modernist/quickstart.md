# Quickstart: 일기 홈 1d 검증 (048)

## 1. 기기 없이

```bash
npm run test:logic      # day-boundary·state·day-preview·wiring·home-text 계약 (contracts/write-prompt.md)
npm run test:ui         # 홈·스트립·메뉴·이동·타이머 (contracts/home-screen.md)
npm run lint            # eslint + tsc + 헌법 검사 + prettier
```

통과 기준: 전부 초록 + 위반 주입 V-P1~4, V-H1~5를 하나씩 넣었을 때 각각 실패하고, 되돌리면 다시 초록.

## 2. 실기기 (dev, SM-S901N) — 준비

AGENTS.md 「도구 사용법」 4가지를 갖춘다(Metro dev·잠금 해제·UTF-8·초기화). 초기화 후 모델 재배치가 필요하다
(`pm clear`가 모델을 지운다 — 021 D2 절차). 합성 하루:

```bash
npm run seed:day -- many-camera <어제 날짜>     # 사진 12장 (010)
npm run seed:day -- empty <그제 날짜>           # 0장
```

## 3. 실기기 시나리오

| # | 조작 | 기대 | 스펙 |
| --- | --- | --- | --- |
| D1 | 앱 실행 | 탭 줄 없음. 월·「일기」·큰 날짜·요일·상태·7칸 스트립·신호 줄·「최근 n편」·카드, 하단 고정 바 | US1, SC-001 |
| D2 | 스트립에서 누를 수 있는 다른 칸 | 헤더 날짜·월·하단 「n일」 함께 바뀜. 흐린 칸은 반응 없음 | US1-3·4 |
| D3 | 어제(12장) 선택 | 사진 칸 「12」, 다닌 자리 칸 숫자 또는 「없음/모름」 | US3, SC-005 |
| D4 | 그제(0장) 선택 | 사진 칸 「없음」 | SC-005 |
| D5 | `adb shell pm revoke com.anonymous.alpharium android.permission.READ_MEDIA_IMAGES` 후 재실행, 어제 선택 | 사진 칸 「모름」 | SC-005 |
| D6 | (정오 전 세션) 오늘 칸 누름 | 하단 「오늘 일기는 오후 12시부터 쓸 수 있어요」, 쓰기 버튼 없음, 「쓸 수 있는 때」「오후 12시부터」 | US2, SC-003 |
| D7 | (가능하면) 11:58에 D6 상태로 두고 12:00 넘김 | 조작 없이 [일기 쓰기 │ n일] 등장 | SC-004 |
| D8 | `⋯` → 「설정」 → 「← 일기」 / 다시 → 뒤로 가기 | 설정 내용 그대로, 홈 복귀 시 고른 날 유지 | US4, SC-006, Q4 |
| D9 | `⋯` → 「개발자」 → 뒤로 가기 | 개발자 화면·복귀 | SC-006 |
| D10 | `⋯` 열고 바깥 누름 / 뒤로 가기 | 메뉴만 닫힘 | US4-3 |
| D11 | 하단 「n일」 글자 누름 | 아무 일 없음 | SC-002 |
| D12 | 쓸 수 있는 날 [일기 쓰기] (이미 쓴 날) | 덮어쓰기 확인(012) → 생성 → 상세 → 「← 목록」 → 홈에 새 카드 | US1-6 |
| D13 | 카드들 | 사진 있는 일기 배지 n, 없는 일기 「사진 없음」, 권한 없이 쓴 일기 「사진 모름」 | US5, SC-009 |

D6·D7은 기기 시각을 바꿀 수 없어 실제 오전 세션이 필요하다. 못 하면 T1~T4(기기 없는 가짜 시계)로 갈음하고
스펙의 미확인 잔여로 적는다 — **건너뛴 것은 통과가 아니다**(원칙 V).

## 4. Maestro

```bash
node scripts/run-device-tests.mjs
```

새 `.maestro/diary-home-1d.yml`과 갱신된 흐름(research R12)이 통과. `parallel-model-download`·`download-conflict`
는 알려진 실패(037·026)로 기록만 한다.

## 5. prod 게이트 (선택)

`EXPO_PUBLIC_APP_ENV=prod`로 Metro를 띄워 `⋯` 메뉴에 「개발자」가 없는지 본다(SC-006). release 빌드는 만들지
않는다(AGENTS.md 「테스트」).

## 6. 위반 주입 기록 (T039, 2026-09-24)

하나씩 넣고 해당 테스트를 돌린 뒤 되돌렸다. **아홉 가지 모두 잡혔다.**

| # | 주입 | 잡은 테스트 |
| --- | --- | --- |
| V-P1 | 정오 전 오늘을 `writable: true`로 붙임 | `state.test.ts` I2·009-11·009-12 외 (10건 실패) |
| V-P2 | `writableAt`이 새벽에도 정오를 줌 | `day-boundary.test.ts` DB2·DB5, `state.test.ts` WP4 |
| V-P3 | `toDayPreview`가 `none` → `{known, 0}` | `day-preview.test.ts` DP2 |
| V-P4 | `state.ts`가 `signals/types` import | `state.test.ts` DP8 |
| V-H1 | `WriteBar`의 `writable` 조건 무력화 | `diary-list.test.tsx` B4·B5 |
| V-H2 | `DiaryListScreen`이 `signals/types` import | `home-text.test.ts` G9 |
| V-H3 | `home-text.ts`에 「오후 12시부터」 리터럴 | `home-text.test.ts` G10 |
| V-H4 | 개발자 메뉴 항목을 무조건 넣음 | `home-navigation.test.tsx` M6 |
| V-H5 | `write-day-label`을 `write-button` 안으로 | `diary-list.test.tsx` B1·B3 |
