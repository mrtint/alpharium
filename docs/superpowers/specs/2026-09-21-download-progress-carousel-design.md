# 설계: 다운로드 진행 화면(캐러셀 + 프로그레스 바) 완성

- 날짜: 2026-09-21
- 관련 스펙: `specs/045-onboarding-download-consent/`(계약·판정 유지), 본 작업은 그 화면 구현을 완성한다
- 관련 로드맵: 로드맵 29번(045) 후속 보강

## 배경

045는 다운로드 동의 → 진행 슬라이드 → 완료 → 작명 순서와 그 전이를 지배하는
순수 판정(`src/firstrun/progress.ts`의 `resolveFirstRunStage`, `src/firstrun/
consent.ts`의 `resolveSlideStage`)까지는 계약대로 짰다. 그러나 실제 화면
(`src/ui/DownloadProgressScreen.tsx`)은 그 계약의 최소 골격만 구현했다:

- 슬라이드는 4초 자동 타이머로만 넘어간다. 스와이프 조작이 없다.
- 이미지 자리는 빈 회색 사각형 고정 하나뿐(045가 의도적으로 후속으로 미룸,
  본 작업도 유지).
- 프로그레스 바 4칸은 정적이다 — 실제 다운로드 fraction을 반영하지 않고,
  칸 채움 애니메이션도 없다.
- 다운로드 실패 시 캐러셀·진행바 화면 전체가 별도의 막다른 실패 화면
  (`download-progress-failed`)으로 완전히 바뀌고, 사용자가 [다시 시도]를
  눌러야 재개된다.

저장소 소유자가 실기기에서 이 화면을 보고 "설계한 적 없는 정적 페이지"라고
지적했다. 이번 작업은 `DownloadProgressScreen`과 `consent.ts`를 다시 짜서
원본 Modernist 디자인 마크업(`1o`~`1q`)의 의도(카드 캐러셀 + 4분할 진행 바)를
실제로 구현하고, 대화에서 정한 대로 원본과 다른 지점(수동 스와이프 지원,
실패를 화면 전환 없이 처리)을 반영한다.

**범위 밖**: `045`의 동의 다이얼로그(`DownloadConsentDialog`), 다운로드 트리거
배선(`essential-assets-port.ts`), 단계 전이 판정(`resolveFirstRunStage`) —
전부 그대로 유지한다. 이미지 슬롯에 실제 이미지를 채우는 것도 범위 밖(045가
이미 후속으로 미뤄둔 것을 유지).

## 확정된 동작

### 1. 카드 캐러셀
- 4장의 카드(제목 + 본문 + 이미지 슬롯)를 순환한다.
- **무한 순환** — 4번째에서 더 넘기면 1번째로, 1번째에서 반대로 넘기면
  4번째로 돌아간다.
- **손 스와이프**로 넘긴다. 동시에 **4초 자동 타이머**로도 넘어간다(원본
  유지) — 사용자가 스와이프한 시점부터 다시 4초를 센다(라이브러리 기본
  동작에 위임, 별도 조율 로직을 만들지 않는다).
- 문구(제목·본문)는 045가 이미 정한 4개 고정 상수(`SLIDES`)를 그대로 쓴다.

### 2. 프로그레스 바 — 캐러셀과 독립
- `essentialDownloadFraction()`(029, 기존 계약 무변경)이 내는 합산 fraction
  (0~1 연속값)을 **4개 칸에 25%씩 나눠 채운다**. 예: 전체 62% → 1·2번 칸
  완전히 채워짐, 3번 칸은 48%만큼만 채워짐(칸 경계 0%/25%/50%/75%/100%).
- 채워지는 칸(현재 진행 중인 칸)에는 채워지는 움직임을 보여주는 애니메이션을
  준다(원본의 `barblink` 깜빡임 대신, 실제 진행 폭을 보여주는 애니메이션 —
  구현 단계에서 reanimated의 `withTiming`으로 폭을 보간).
- 이 바는 **캐러셀 카드 전환과 완전히 무관**하다 — 카드가 넘어가도 리셋되지
  않고, 다운로드가 끝날 때까지 유지된다.
- 원칙 IV 경계는 그대로 유지한다 — 화면이 구독하는 값은 fraction 하나뿐,
  모델 식별자·바이트·전송 속도는 여전히 화면에 없다.

### 3. 완료
- fraction이 100%(`downloadReady: true`)가 되면 캐러셀 대신 완료 뷰
  ("준비됐어요" + "시작할게요" 버튼)를 보여준다(045 기존 설계 그대로,
  변경 없음).
- 사용자가 버튼을 눌러야 다음(작명) 화면으로 넘어간다 — 자동 전환 없음.

### 4. 실패 처리 — 화면 전환 없이
- 기존 045의 전용 실패 화면(`download-progress-failed`, [다시 시도] 버튼)을
  **제거**한다.
- 대신 캐러셀·프로그레스 바 화면을 그대로 유지한 채, **프로그레스 바 바로
  아래 텍스트만** "받다가 멈췄어요"로 바뀐다.
- 재시도는 **자동**이다 — 10초 간격으로 백그라운드에서 계속 재시도하며,
  사용자 조작 없이 성공할 때까지 무한 반복한다.
- 오류 원문·실패 사유는 노출하지 않는다(원칙 III 유지, 045와 동일한 경계).

## 컴포넌트/라이브러리 선택

**`react-native-reanimated-carousel`을 신규 도입**한다(+peer dependency
`react-native-gesture-handler`).

- 무한 순환·스와이프 제스처를 라이브러리의 `loop: true` 옵션과 팬 제스처
  처리에 맡긴다 — 직접 구현(끝에서 첫 카드로 점프시키는 재정렬 트릭)보다
  안정적이고 검증된 경로다.
- `react-native-reanimated`는 032에서 이미 peer dep으로 들어와 있으나
  실사용 0건이었다 — 이 작업이 그 첫 실사용이 된다.
- `react-native-gesture-handler`는 **이 프로젝트에 처음 도입되는 새 네이티브
  링크 모듈**이다. `npx expo prebuild`가 필요하고, AGENTS.md 기준대로 dev
  debug 실기기 검증으로 완료 처리한다 — release 재확인은 저장소 소유자가
  이 세션에서 명시적으로 요청할 때만 별도로 수행한다.

## 바뀌는 파일 (예상)

- `package.json` — `react-native-reanimated-carousel`, `react-native-gesture-
  handler` 추가(`npx expo install`로 버전 해석, AGENTS.md 「Expo 작업 시」
  절 준수)
- `App.tsx`의 `App` 루트 — `GestureHandlerRootView`로 감싸는 배선 필요 여부
  확인(gesture-handler 요구사항)
- `src/firstrun/consent.ts` — 슬라이드 인덱스 판정을 캐러셀의 현재 인덱스
  (사용자 스와이프로 바뀔 수 있는 값)를 반영하도록 재검토. 자동 타이머
  로직은 라이브러리의 `autoPlay`/`autoPlayInterval`에 위임할지, 기존처럼
  앱이 타이머를 들고 캐러셀 `ref`로 넘길지는 구현 단계에서 라이브러리
  API를 보고 정한다.
- `src/ui/DownloadProgressScreen.tsx` — 전면 재작성: `Carousel` 컴포넌트
  통합, 4분할 애니메이션 프로그레스 바, 실패 문구를 진행바 하단에 배치,
  기존 실패 전용 뷰(`download-progress-failed`)·`onRetry` prop 제거하고
  내부 자동 재시도 타이머로 교체
- `App.tsx`의 다운로드 트리거 `useEffect` — 실패 시 상태를 `downloadFailed`
  로 세우는 것은 유지하되, 사용자 재시도 콜백(`onRetryDownload`) 대신 화면이
  스스로 주기적으로 재시도 신호를 보내거나, `App.tsx`가 실패 후 10초마다
  자동으로 `essentialDownloadStarted.current`를 리셋하는 내부 타이머를 두는
  두 방식 중 구현 단계에서 더 단순한 쪽을 택한다(순수 판정은 `src/firstrun/`
  에 두고 타이머는 화면 또는 `App.tsx`에 둔다는 기존 경계 유지)
- 계약 테스트: `download-progress-screen.test.tsx` — 실패 뷰 관련 기존
  케이스 제거/교체, 캐러셀 인덱스·프로그레스 바 분할 계산에 대한 순수 함수
  테스트 추가

## 지켜야 할 기존 계약 (변경하지 않음)

- `resolveFirstRunStage`의 단계 전이 우선순위(045 그대로) — `"download-
  consent"` → `"downloading"` → `"naming"` 순서 불변.
- `essentialDownloadFraction()`(029)의 계산 방식과 시그니처 — 화면이 이
  값을 소비하는 방식만 바뀐다.
- 원칙 IV — 모델 식별자·바이트·속도·시간 정밀 지표 미노출.
- 원칙 III — 실패 원문 미노출.
- `downloadProceedConfirmed` 게이트(045 구현 중 발견한 갭) — 완료 화면
  버튼을 눌러야 다음으로 넘어가는 것 유지.

## 테스트 전략

- 순수 함수(캐러셀 인덱스 계산·4분할 fraction 매핑)는 `.ts` 계약 테스트로
  기기 없이 검증.
- 실제 캐러셀 컴포넌트 자체(제스처 반응)는 jest-expo 환경에서 완전히
  검증되지 않는다(033의 reanimated jest mock 함정과 같은 계열) — 최종
  확인은 dev debug 실기기 1회(AGENTS.md 기준).
- 실패 → 자동 재시도 루프는 기기 없는 테스트로 타이머 기반 재시도 호출
  횟수를 검증(jest fake timers).

## 미해결/후속 확인 필요

- `react-native-gesture-handler` 도입이 032·033이 만든 기존 눌림 피드백
  (Pressable responder 계열)과 충돌하지 않는지는 구현 후 실기기에서 확인.
- 이미지 슬롯 실제 에셋은 범위 밖으로 유지(045가 이미 미룬 것).
