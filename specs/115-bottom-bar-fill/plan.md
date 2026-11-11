# Implementation Plan: 하단 바의 색을 화면 맨 아래까지 채운다

**Branch**: `115-bottom-bar-fill` | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

**Input**: `specs/115-bottom-bar-fill/spec.md`, 설계 `docs/superpowers/specs/2026-11-11-bottom-bar-fill-design.md`

## Summary

홈의 루트 `SafeAreaView`에서 `bottom`을 걷고, 아래 인셋을 쓰는 곳 셋이 각자 비킨다 — ① 하단 바 세 개는 자기 색으로 인셋만큼 내려간다(최소 높이·아래 여백에 인셋을 더함) ② 겹(`StackLayer`)은 안쪽 여백으로 비킨다 ③ 고정 바닥값(토스트 88·24)과 지면 아래 여백(120)에 인셋을 더한다. 인셋은 `SafeAreaInsetsContext`로 읽는 작은 훅 한 곳(`useBottomInset`)에서 얻고, 바 치수는 순수 함수 `barMetrics(inset)` 한 곳에서 정한다. 새 문구·색·숫자 없음.

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, RN 0.86), `react-native-safe-area-context`

**Primary Dependencies**: 없음(새 의존성 없음)

**Storage**: N/A

**Testing**: jest `logic`(`barMetrics`)·`ui`(RNTL, `SafeAreaInsetsContext.Provider`로 인셋 주입, 소스 계약), iOS 시뮬레이터 스크린샷(iPhone 17e), iPhone 14(사람)

**Target Platform**: iOS·Android 앱(이번 확인은 iOS만)

**Project Type**: mobile-app

**Performance Goals**: 없음(레이아웃 값만 바뀐다)

**Constraints**: 새 숫자 없음(원칙 V), 보드에 없는 장식 없음, 화면 한글은 카탈로그에만, 첫 실행 화면은 자기 `SafeAreaView` 그대로

**Scale/Scope**: 코드 파일 4개(`App.tsx`·`StackLayer.tsx`·`DiaryListScreen.tsx`·새 `safe-bottom.ts`)와 문서 둘(`DESIGN.md`·`AGENTS.md`), 테스트 3~4개

## Constitution Check

| 원칙 | 판정 |
|---|---|
| I 온디바이스 | 해당 없음 |
| II 프롬프트 | 해당 없음 |
| III 캐릭터는 모델 위에 | UI가 모델·로스터를 건드리지 않는다. 통과 |
| IV 측정 장치 없음 | 측정 코드를 두지 않는다. 통과 |
| V 관측과 추측 | 안드로이드(3버튼 아이콘 색·scrim·제스처)는 못 본 것으로 적는다. iPhone 14의 사람 확인은 결과를 받기 전에 「확인했다」고 쓰지 않는다. 숫자는 기존 값. 통과 |

Post-design: 판정이 바뀌지 않는다. `src/ui/`가 `models/roster` 등에 닿지 않는다.

## Project Structure

### Documentation

```text
specs/115-bottom-bar-fill/
├── spec.md · plan.md · research.md · quickstart.md
├── contracts/bottom-bar.md
├── checklists/requirements.md
└── tasks.md
```

데이터 모델은 없다(저장·엔티티 변경 없음) — `data-model.md`를 만들지 않는다.

### Source Code

```text
App.tsx                         # 홈 SafeAreaView edges에서 bottom 제거, 토스트 바닥에 인셋 더함
src/ui/safe-bottom.ts           # (새) useBottomInset()
src/ui/bar-metrics.ts           # (새) barMetrics(inset) — RN 없는 순수 함수
src/ui/StackLayer.tsx           # 겹 안쪽 paddingBottom = 인셋
src/ui/DiaryListScreen.tsx      # 바 세 개 치수·지면 아래 여백·주석
design/DESIGN.md                # 바 면이 안전 영역까지 닿는다는 한 줄
AGENTS.md                       # 홈 항목에 한 줄
__tests__/ui/safe-area.test.tsx # 소스 계약(홈 edges·겹)
__tests__/ui/bottom-bar-fill.test.tsx   # (새) 렌더 계약
__tests__/app/bar-metrics.test.ts       # (새) barMetrics
```

**Structure Decision**: 인셋 읽기(`safe-bottom.ts`)와 바 치수(`bar-metrics.ts`, RN 없는 순수 함수)를 한 쌍으로 모아 세 호출처가 같은 규칙을 쓰게 한다(규칙 복제 방지).

## 설계

1. `useBottomInset(): number` — `useContext(SafeAreaInsetsContext)?.bottom ?? 0`(`PhotoViewer`와 같은 방식).
2. `barMetrics(inset)` — `{ minHeight: WRITTEN_DAY.bar.minHeight + inset, paddingBottom: BAR_PADDING_V + inset }`. `BAR`의 `paddingVertical: 10`을 위 10·아래 10 + 인셋으로 나눈다(`paddingTop`·`paddingBottom`). 글은 `justifyContent: "center"`로 내용 상자(위 64 안) 안에 선다.
3. 바 세 개(`WriteBar`·`StopBar`·`RewriteBar`의 Pressable)는 `[BAR, barMetrics(inset), {backgroundColor}]`. 잰 높이(`onLayout`)가 바 + 인셋이라 토스트·제약 띠의 `bottom`과 `RewriteBar`의 내려가는 거리(`translateY = 높이`)가 따라온다. 내려갈 때 바는 화면 밖(ROOT가 `overflow: hidden`)으로 간다.
4. 지면 아래 여백: 쓰는 중 `WritingPaper`도 `120 + 인셋`. 안 쓴 날 `MATERIAL_GRID.paperPadding.bottom + bandInset + inset`, 쓴 날 `bottomInset = bandInset + inset`. 지면은 ROOT 바닥까지 닿는다(루트 인셋이 없으므로).
5. `App.tsx`: 홈 `edges={["top","left","right"]}`, `toastBottom = (route !== "home" ? 24 : HOME_TOAST_BOTTOM) + inset`. 첫 실행 `SafeAreaView`들은 그대로.
6. `StackLayer`: `[absoluteFill, layer, style, { paddingBottom: inset }]`. 중첩 겹은 절대 배치라 부모 패딩을 받지 않고 자기 인셋을 따로 비킨다.
7. 주석 갱신: `BAR`의 「아래 안전 영역은 루트가 비킨다」, 쓴 날 분기의 「내려간 바가 내비게이션 바 뒤로 비치지 않게 자른다」, `App.tsx`의 `edges` 주석.
