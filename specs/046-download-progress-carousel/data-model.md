# Phase 1 Data Model: 다운로드 진행 화면(캐러셀 + 프로그레스 바) 완성

이 기능은 영구 저장 데이터를 새로 만들지 않는다(spec Assumptions). 아래는
화면·판정 모듈이 세션 동안 다루는 타입 형태다.

## CarouselCardIndex

캐러셀이 지금 보여주고 있는 카드의 위치.

- **타입**: `0 | 1 | 2 | 3` (4장 고정, 045의 `SLIDES` 배열과 동일한 4개)
- **소유**: 화면 로컬 state(`DownloadProgressScreen` 내부) — 파일에 저장하지
  않는다(009 원칙 계승, 045의 "재시작하면 항상 1번부터" 유지).
- **갱신 경로**: 캐러셀 라이브러리의 `onSnapToItem(index)` 콜백(사용자
  스와이프 또는 라이브러리 autoplay가 이 카드로 정착했을 때 발생) — 앱이
  직접 인덱스를 계산하지 않는다(라이브러리에 위임, research R1).
- **범위 밖**: 몇 바퀴를 돌았는지(누적 회전수) 같은 값은 다루지 않는다 —
  카드 자체가 4개뿐이고 "지금 무엇을 보고 있는가"만 의미가 있다.

## DownloadProgressFraction (기존, 무변경)

- **출처**: `essentialDownloadFraction()`(`src/onboarding/essential-assets.ts`,
  029) — 이 기능이 정의하지 않고 그대로 소비한다.
- **타입**: `number`, `[0, 1]` 범위로 clamp됨.
- **의미**: VLM(v1+v2)과 캐릭터 모델(a1) 3개 자산의 합산 바이트 진행률.

## ProgressSegments (신규)

`DownloadProgressFraction` 하나를 4개 구간의 채움 비율로 펼친 표현.

- **타입**: `readonly [number, number, number, number]`, 각 원소는 `[0, 1]`
- **계산**: 순수 함수 `progressSegments(fraction: number)` —
  `segment[i] = clamp((fraction - i * 0.25) / 0.25, 0, 1)` for `i in 0..3`
- **소유**: 저장하지 않는다 — `fraction`이 바뀔 때마다 매번 다시 계산되는
  파생값이다.
- **불변식**: `fraction`이 증가하면(퇴행 없음, spec SC-004) 모든
  `segment[i]`도 감소하지 않는다. `fraction === 1`이면 4개 전부 `1`.

## DownloadFailureState (기존 필드 재해석, 구조 변경 없음)

- **타입**: `boolean`(`App.tsx`의 기존 `downloadFailed` state 그대로)
- **045와 달라지는 점**: 이 값이 `true`가 됐을 때 화면이 별도 레이아웃
  (`download-progress-failed`)으로 전환되던 것을, 같은 레이아웃 위 안내
  문구 교체로 바꾼다 — 타입·소유 계층(`App.tsx`)은 무변경.
- **재시도 트리거**: 기존 사용자 콜백(`onRetry`) 대신, `App.tsx`가
  `downloadFailed === true`인 동안 10초 간격 `setInterval`로 재시도를
  스스로 트리거한다(research R6). 화면에는 재시도 콜백을 더 이상 넘기지
  않는다.

## FirstRunStage (기존, 무변경)

- `src/firstrun/progress.ts`의 `resolveFirstRunStage()` 우선순위·시그니처는
  그대로다. 이 기능은 `"downloading"` 단계가 보여주는 **화면의 내부
  구현**만 바꾼다 — 언제 이 단계로 들어오고 나가는지의 판정 로직은 건드리지
  않는다.
