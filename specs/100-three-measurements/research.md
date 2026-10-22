# Research: 실측 세 가지

## R1. 제목 구간을 어디서 재는가

- **Decision**: `adb logcat` 두 번째 모델 호출의 시작·끝 신호로 잰다. 신호가 로그에 없으면 같은 쓰기를 `adb shell screenrecord`로 녹화하고 프레임 시각으로 본문 완성(본문 토큰 종료)~쓰기 완료 구간을 잰다. 녹화로 재면 호출 사이 저장·정리가 섞이므로 그 사실을 원값 옆에 적고 값은 상한으로 쓴다(상한이 4초 미만이면 확정 닫음).
- **Rationale**: 제품 코드에 타이머를 더하면 원칙 IV를 어긴다. 앱 밖 관측만 쓴다. 먼저 한 번 시험 쓰기로 logcat에 어떤 줄이 나오는지(llama.cpp 성능 요약 등) 확인한다 — **이 신호원은 지금 짐작이다**.
- **Alternatives**: 임시로 코드에 로그 → 기각(IV, 측정 후 되돌려도 번들이 다르다).

## R2. 동작 줄이기가 읽히는 방식

- **Decision**: 안드로이드는 「애니메이션 제거」를 켜 `transition_animation_scale`(및 animator/window)이 0이 되는 것을 `adb shell settings get`으로 기록한다. 소스 읽기상 reanimated(ReduceMotion.System)와 RN `AccessibilityInfo`가 이 값을 읽는다고 보지만 **실측으로 확정**한다. iOS는 시뮬레이터 설정 접근성 「동작 줄이기」.
- **Rationale**: 둘 다 OS 한 값을 본다는 것은 소스 해석이며 장면별 녹화가 사실을 준다.
- **Alternatives**: `AccessibilityInfo`를 앱에서 로그 → 기각(IV, 코드 변경).

## R3. 내려받기 화면을 모델 보존하며 보는 법

- **Decision**: 074 절차(`run-as`로 `files/models`를 `files/models.074bak`으로 옮기고 `onboarding.json`의 `downloadConsented`만 조정)를 따른다. 끝나면 모델 폴더를 원위치하고 `onboarding.json`을 복원하며 파일 목록을 대조한다. 받기는 시작만 보고 끊는다. `pm clear`·재설치 금지.
- **Rationale**: 074가 같은 방식으로 검증했다. iOS 시뮬레이터는 모델 지장 없이 앱 데이터를 쓴다.
- **Alternatives**: 새 빌드로 첫 실행 → 기각(모델 삭제).

## R4. 짧은 화면 환경

- **Decision**: 083 `captures/after/font-scale-2/{android,ios}`의 쓴 날 캡처(shot-01)에서 먼저 본문 줄 수를 센다. 새 촬영은 iPhone SE 3rd gen 시뮬레이터(iOS 27 런타임에 기기 타입이 없으면 가장 가까운 667pt 화면 기기나 창 크기로 갈음하고 적는다) 글꼴 1.0·약 2.0배.
- **Rationale**: 이미 있는 증거를 먼저 쓴다(로드맵). 지원 대상 기기(M1)가 미확인이라는 한계를 결과에 적는다.
- **Alternatives**: 안드로이드 작은 화면 에뮬레이터 → 로드맵 범위 밖.

## R5. 후속 변경이 열릴 때 닿는 곳(소스 확인)

- 제목: `ProgressStage` 유니온(`src/inference/types.ts`), 단계 전환 지점(`src/inference/on-device.ts` 제목 질문 앞), 혼잣말 풀(`src/diary/monologue.ts`·`src/i18n/catalogs/ko/monologue.ts`). 고칠 단언: 위 설계문서 목록.
- 자동 넘김: `src/ui/DownloadProgressScreen.tsx`의 `CarouselSlides` `autoplay`. 소스 정규식 테스트(`download-progress-screen.test.tsx`)가 `autoplay` 낱말을 요구하므로 낱말을 남기는 꼴(`autoplay={!reduceMotion}`)로 바꾼다.
- 쓴 날: 후속 변경은 코드가 아니라 소유자 보고이며 `photoHeight`(`src/ui/theme/tokens.ts`)는 결정 전 불변.
