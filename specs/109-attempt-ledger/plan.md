# Implementation Plan: 자동 쓰기 시도의 날짜별 장부

**Branch**: `109-attempt-ledger` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/109-attempt-ledger/spec.md` · 설계: `docs/superpowers/specs/2026-11-01-attempt-ledger-design.md`

## Summary

최근 20건 시도 기록(`preferences/auto-write-attempts.json`)을 날짜별 장부(`attempt-ledger/YYYY-MM-DD.json`, 상한·자동 삭제 없음)로 바꾼다. 쓰는 함수 `recordAttemptStart/End/Expired`의 호출 계약과 갈래 상수는 그대로 두고 **저장 통로만 날 단위로** 바꾼다(`src/app/auto-write-attempts.ts` 한 파일). 읽는 쪽은 진단·개발자 화면의 「최근 자동 쓰기 시도」 묶음을 「날짜별 백그라운드」 요약으로 바꾼다(UI 부품 `AttemptsGroup`은 값만 받으므로 그대로, 변환 `attemptLines()` → 요약 변환, 카탈로그 문구 교체). 안드로이드 백업 규칙에 `attempt-ledger/` 제외를 더한다.

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, RN 0.86)
**Primary Dependencies**: `expo-file-system`(기존 `*Sync()` 규칙), 신규 의존성 없음
**Storage**: 문서 디렉터리 `attempt-ledger/YYYY-MM-DD.json` 하루 한 파일(임시 파일 쓰고 옮기기, 060과 같다)
**Testing**: jest `logic`(순수·소스 계약)·`ui`(진단/개발자 화면), 기기: SM-S901N dev 빌드
**Target Platform**: Android·iOS 모두 기록, 안드로이드만 백업 제외
**Project Type**: mobile-app
**Performance Goals**: 날 파일 하나 읽고 다시 쓰기(하루 약 100줄 이하, 약 10KB — 추정, 실측 없음 `[미확인]`). 화면은 최대 14개 파일을 읽는다.
**Constraints**: 기록 실패는 삼킨다. 호출부(`task.ts`·`use-auto-write-handoff.ts`·`bg-expiry-port.ts`)의 기록 호출 계약 불변. 일기 본문·장소·사진 정보 불포함.
**Scale/Scope**: 하루 수십~백 줄 × 무기한(1년 약 3.6MB 추정)

## Constitution Check

| 원칙 | 판정 |
|---|---|
| I 온디바이스 | 통과 — 장부는 기기 밖으로 나가지 않는다. 네트워크 없음 |
| II 화자·시야 | 해당 없음 — 프롬프트·일기 내용 불변 |
| III 캐릭터는 모델 위 | 통과 — `src/ui/`가 `models/roster`에 닿지 않는다. UI 부품 불변 |
| IV 측정 장치 금지 | 통과 — 모델 출력을 채점하지 않는다. 담는 것은 078 이래 같은 줄(시각·경로·결과 갈래·선택 `launch`·`wake`·`day`)이고 소요 시간·토큰·이유 문자열은 싣지 않는다(FR-005, 계약 테스트). 횟수는 줄을 세는 것이다 |
| V 실측과 추측 구분 | 통과 — 하루 크기·1년 용량은 `[추정]`·`[미확인]`으로 적는다 |

사후 점검(설계 뒤): 위 판정 그대로. 새 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/109-attempt-ledger/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/ledger-file.md  contracts/day-summary.md
└── tasks.md  (/speckit-tasks)
```

### Source Code

```text
src/app/auto-write-attempts.ts     통로를 날 단위로(read(day)·write(day,…)·days()), 기록 함수는 장부에 쓴다,
                                    20건 상한·파일 읽기 제거, 요약(summarizeDay)·범위(summaryDays) 추가
src/app/diagnostics-view.ts        attemptLines(items) → ledgerLines(summaries) (같은 AttemptLine 모양)
src/i18n/catalogs/ko/attempts.ts   문구: 묶음 이름·빈 상태·요약 줄 (옛 path·line 문구는 쓰는 것만 남긴다)
src/schedule/task.ts               기본 통로 주석만 (호출 불변)
App.tsx                            두 곳의 loadAutoWriteAttempts → loadAttemptSummaries(…, now)
plugins/with-backup-rules.js       attempt-ledger/ 제외 추가 (안드로이드)
src/ui/AttemptsGroup.tsx           변경 없음 (값만 받음) — 머리말 주석의 옛 설명만 고친다
```

테스트·문서: `__tests__/app/auto-write-attempts.test.ts` 재작성, `auto-write-attempts-wiring.test.ts`·`diagnostics-view.test.ts`·`developer-screen.test.tsx`·`diagnostics-screen.test.tsx`·`i18n/boundaries.test.ts`·`config/backup-rules-plugin.test.ts` 갱신, `scripts/layer1/baseline.ts`·`layer2-ios/app-delete.ts` 주석·표, `AGENTS.md`·`docs/background-write-conditions.md`·`src/app/README.md`·로드맵.

**Structure Decision**: 기존 모듈 파일 이름(`auto-write-attempts.ts`)과 함수 이름을 유지해 호출부·UI 변경을 최소화한다.
