# Phase 0 Research: 필수 자산 다운로드 동의 안내와 진행 슬라이드

## R1 — 동의 상태를 어디에 저장하는가

**Decision**: `onboarding.json`(021·035가 이미 쓰는 파일)에 네 번째 boolean
필드 `downloadConsented`를 추가한다. 새 파일을 만들지 않는다.

**Rationale**: `flag.ts`의 기존 주석이 025 시점에 세운 원칙을 그대로 따른다
— "새 영구 저장 파일이 없다"(035가 `welcomeShown`을 추가할 때도 "별도 파일을
만들면 진입 게이트가 읽을 파일이 하나 더 늘 뿐 얻는 것이 없다"고 판단).
`downloadConsented`도 `completed`·`batteryNoticeShown`·`welcomeShown`과
성격이 같다 — **1회성 사용자 결정을 기록하는 boolean**이며 진행 중 상태
(어느 슬라이드인가, 몇 % 받았는가)는 담지 않는다. 원칙 IV의 "필드는
boolean만" 관례를 유지한다.

**Alternatives considered**:
- 별도 `download-consent.json`: 파일 하나가 더 늘 뿐 `onboarding.json`과
  같은 생명주기(앱 재설치 전까지 유지)를 가지므로 분리할 이유가 없다.
- 041의 다운로드 상태 파일에 필드 추가: 041의 재개 가능한 다운로드 계층은
  "무엇을 얼마나 받았는가"라는 별개 관심사다. 동의는 다운로드 메커니즘과
  무관한 사용자 결정이므로 합치면 041 계약이 다루지 않는 필드가 섞인다.

## R2 — `resolveFirstRunStage`(040)를 어떻게 바꾸는가

**Decision**: `FirstRunStage` 유니온에 `"download-consent"`와
`"downloading"`(또는 기존 `"waiting-for-download"`를 슬라이드 화면 의미로
재정의)를 추가하고, 우선순위를 다음으로 바꾼다:

```
1. onboardingNeeded && !onboardingStarted → "logo"
2. onboardingNeeded                        → "onboarding"
3. !downloadConsented && !downloadReady    → "download-consent"
4. downloadConsented && !downloadReady     → "downloading"
5. !namingDone                             → "naming"
6. namingDone && livenessOutcome !== "ok"  → "liveness"
7. 그 외                                    → "done"
```

**Rationale**: 040의 원래 우선순위(`!namingDone → "naming"`이 다운로드 상태
확인보다 먼저)를 정확히 뒤집는 것이 이 스펙의 핵심 요구사항이다(spec FR-008).
`downloadReady`가 이미 참이면(필수 자산을 이미 받은 사용자, 업그레이드
케이스) 3·4단계를 건너뛰어 FR-009(동의·슬라이드 생략)가 자동으로 성립한다
— 별도 분기를 추가하지 않아도 된다.

**Alternatives considered**:
- `namingDone`과 `downloadReady`를 합쳐 하나의 조합 상태로 만드는 방식:
  040이 이미 "작명↔다운로드 병렬"을 위해 이렇게 설계했었다. 이번 스펙은
  병렬성 자체를 없애므로(순차 진행) 오히려 단순한 선형 우선순위가 더
  읽기 쉽고 회귀 위험이 적다.

## R3 — 슬라이드 단계를 어떻게 판정하는가 (진행률과 독립적으로)

**Decision**: 슬라이드 단계(1~4)는 `downloading` 상태에 진입한 시각으로부터
경과한 시간을 4초 간격으로 나눈 값으로 판정하고, 다운로드가 끝나면(외부
입력 `downloadReady === true`) 슬라이드 상태와 무관하게 즉시 완료 화면
(`1q`)으로 전환한다.

```
slideIndex = min(3, floor(elapsedMs / 4000))  // 0~3 (슬라이드 1~4)
downloadReady === true 이면 → "complete" (slideIndex 무시)
```

**Rationale**: spec Edge Case("슬라이드가 3번째까지 넘어갔는데 다운로드가
안 끝나면 4번째에 머무른다")와 FR-005a(4초 간격)·FR-006(진행률과 무관)을
동시에 만족하는 가장 단순한 식이다. `min(3, ...)`이 자연스럽게 "4번째에서
멈춘다"를 구현한다 — 별도의 "머무름" 분기가 필요 없다.

**Alternatives considered**:
- 다운로드 진행률(`essentialDownloadFraction`)에 슬라이드 단계를 비례시키는
  방식: 헌법 원칙 IV 위반이다 — 진행률이 슬라이드 전환 속도에 반영되면
  "다운로드가 몇 % 됐는지"가 화면 전환 타이밍이라는 형태로 사용자에게
  간접 노출된다(빠른 슬라이드 전환 = 빠른 다운로드라는 추론이 가능해짐).
  FR-006이 명시적으로 금지하는 자리다.

## R4 — `WaitingForDownloadScreen`을 어떻게 하는가

**Decision**: 새 `DownloadProgressScreen`이 그 역할을 완전히 대체한다.
`WaitingForDownloadScreen.tsx`와 그 테스트는 삭제한다.

**Rationale**: 040 설계에서 `WaitingForDownloadScreen`은 "작명이 먼저
끝났는데 다운로드가 안 끝났을 때"라는 병렬 흐름 전용의 보조 화면이었다.
이 스펙이 병렬 흐름 자체를 없애므로(R2) 그 화면이 존재할 문맥이 사라진다.
남겨두면 어디서도 렌더되지 않는 죽은 코드가 된다(방금 청소한
`CharacterPicker.tsx`와 같은 문제를 새로 만들지 않는다).

**Alternatives considered**:
- `WaitingForDownloadScreen`을 `DownloadProgressScreen`의 "완료 대기"
  서브뷰로 재사용: 리뷰 보드 `1o`~`1q`는 스피너+진행바가 아니라 슬라이드
  구조라 레이아웃이 근본적으로 다르다 — 재사용보다 새로 쓰는 편이 명확하다.

## R5 — Dialog 구현 방식 (NativeWind 언급 관련)

**Decision**: RN 코어 `Modal`(전체화면 아님, `transparent` 배경 + 중앙
카드) + NativeWind `className`으로 스타일링한다. 별도 Dialog 라이브러리를
추가하지 않는다.

**Rationale**: 사용자 설명에 "NativeWind에서 제공하는 Dialog"라는 표현이
있었으나, NativeWind는 스타일링 엔진(Tailwind 클래스를 RN 스타일로
변환)이지 자체 Dialog 컴포넌트를 제공하지 않는다(확인: `nativewind`
패키지에 `Dialog`·`Modal` export 없음). 043·044가 이미 RN 코어 컴포넌트에
NativeWind `className`을 입혀 쓰는 패턴을 확립했으므로(`WelcomeScreen.tsx`
등) 그 관례를 그대로 잇는다 — 새 네이티브 의존성 없음(spec Assumptions).

**Alternatives considered**:
- 전용 Dialog 라이브러리(`react-native-paper`, `@rn-primitives/dialog`
  등) 도입: 새 네이티브 의존성이 생기면 012 기준상 release 재확인이
  필요해지고, 043·044의 "새 의존성 없이 진행" 관례에서 벗어난다.

## R6 — 슬라이드 이미지 자리를 어떻게 채우는가

**Decision**: 실제 이미지 에셋을 넣지 않는다. 리뷰 보드의 `image-slot`
(회색조 placeholder)에 대응해 `COLORS.surface` 배경의 빈 사각 영역만
둔다 — 044가 페르소나 아바타를 "로스터가 하나뿐이라 범위 밖"으로 미룬
것과 같은 판단.

**Rationale**: 리뷰 보드 자체가 `placeholder="Photos of a day, laid out
as a contact sheet"` 같은 텍스트로 실제 이미지가 아직 없음을 명시하고
있다. 이미지 에셋 제작은 디자인 리소스가 필요한 별도 작업이며 이 스펙의
"화면 순서 재배치 + 텍스트/구조 이관"이라는 범위를 벗어난다.

**Alternatives considered**:
- 크로스페이드 애니메이션 자체를 구현하되 이미지는 비워둠: 애니메이션
  인프라(4장 순환 페이드)만 만들고 콘텐츠가 없으면 사용자에게 보이는
  것은 빈 회색 사각형이 깜빡이는 것뿐이라 실익이 없다. 정적 배경 하나로
  충분하며, 이미지가 생기면 후속 스펙에서 애니메이션을 추가한다.

## R7 — 041 재개 가능한 다운로드와의 통합

**Decision**: 041이 만든 세그먼트 다운로드 로직(`src/models/segmented/`)과
그 진행률 계약(`essentialDownloadFraction`)을 변경 없이 그대로 쓴다.
`DownloadProgressScreen`은 `essentialsReady`(boolean)만 구독하고, 041의
바이트 단위 진행률은 화면에 전달하지 않는다.

**Rationale**: spec 범위 밖 선언과 일치("041이 이미 세운 재개 가능한
다운로드 포트를 그대로 재사용"). 슬라이드 단계는 R3에서 정한 대로 시간
기반이므로 041의 바이트 진행률을 구독할 필요 자체가 없다 — 오직
"완료됐는가"(`downloadReady`)만 필요하다. 이것이 원칙 IV 경계를 지키는
가장 단순한 통합 지점이다.

**Alternatives considered**: 없음 — 041 계약을 그대로 쓰는 것 외에
합리적 대안이 없다(041의 범위를 다시 여는 것은 이 스펙의 범위 밖).
