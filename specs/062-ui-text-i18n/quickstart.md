# Quickstart: 062 검증 안내

계약 번호는 [contracts/i18n.md](contracts/i18n.md), 값의 모양은 [data-model.md](data-model.md).

## 1. 기기 없이

```bash
npm run test:logic          # L1~L5, D1~D3, C1~C4, K1·K4, B2~B6, G1·G2, V1·V2, 헤드리스 알림(US2-4), 헌법 검사 규칙 테스트(B1·K5·K6·D4)
npm run test:ui             # X1~X3(add-language.test.tsx), 진단 언어 줄 렌더, 기존 화면 테스트(원문 기대값 무수정)
npm test                    # 전부
npm run lint                # eslint + tsc(K2·K3 @ts-expect-error 포함) + 헌법 검사(B1·K5·K6·D4) + prettier
git diff main -- __tests__/diary/prompt-e2sn.test.ts __tests__/diary/prompt.test.ts   # G3 — 출력 0줄
```

**위반 주입**(AGENTS 「위반 주입」 — 치환이 실제로 적용됐는지 먼저 단언한다):

| 주입 | 잡아야 할 것 |
| --- | --- |
| `src/ui/` 화면 파일 하나에 `"테스트"` 리터럴 | 헌법 검사 B1 |
| 가짜 카탈로그에서 항목 하나 삭제 | tsc (K2) |
| `SUPPORTED_LANGUAGES`에 `"xx"` 추가 | tsc K3(카탈로그 없음) + B4 |
| `src/ui/` 파일에서 `diary/particle` import | 헌법 검사 K6 |
| `prompt.ts`에서 `src/i18n` import | B2 |
| 한국어 카탈로그 문구 한 글자 변경 | G1 또는 G2 |
| `text()`가 매번 새 객체를 돌려주게 변경 | C2 |

## 2. dev 실기기 (SM-S901N) — FR-023, SC-007

준비: AGENTS 「도구 사용법」 네 가지(Metro dev 환경, 잠금 해제, UTF-8, `adb reverse`). **`pm clear`를 하지 않는다**(모델·일기 보존).

1. **네이티브 모듈 확인**: `npx expo prebuild --platform android --clean` → dev 빌드(`npx expo run:android`) → `adb shell dumpsys package com.anonymous.alpharium`의
   `requested permissions`를 이전과 비교(짐작: 변화 없음 — 실측으로 기록).
2. **한국어 기기**: 앱을 연다 → 홈·설정·쓰는 중(한 번 써 보기)·대화상자 하나·진단을 지난다. 문구가 이전과 같다. 진단 「환경」에 「언어 · ko-KR → 한국어」 꼴.
3. **영어 기기**: 기기 설정에서 시스템 언어를 English(United States)로 바꾼다 → 앱으로 돌아오거나 다시 연다(프로세스가 다시 뜨는지 `adb shell pidof com.anonymous.alpharium`로
   전후 비교해 기록) → 화면 한국어 그대로. 진단에 「en-US → 한국어」 꼴.
4. **백그라운드 완성 알림**: 영어 기기 상태에서 진단 「자동 쓰기 지금 실행」(재료 있는 날 — 필요하면 `npm run seed:day`) 또는 헤드리스 잡 → 알림 제목
   「{이름}{이|가} {M}월 {d}일 일기를 다 썼어요」 그대로. OS 알림 설정의 채널 이름 「일기 완성 알림」 그대로.
5. 기기 언어를 한국어로 되돌린다.

결과(프로세스 재시작 여부·권한 목록·각 화면)는 이 파일 끝 「실기기 결과」에 적는다. 확인하지 못한 것은 「미확인 잔여」에 한 줄씩(release는 기본 미확인).

## 실기기 결과

(구현 뒤 기록)
