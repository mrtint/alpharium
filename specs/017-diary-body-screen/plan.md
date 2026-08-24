# Implementation Plan: 일기 본문 화면 개선

**Branch**: `017-diary-body-screen` | **Date**: 2026-08-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/017-diary-body-screen/spec.md`

## Summary

**네 자리를 연다 — 캡션에 쓰인 리사이즈 사본을 지우지 않고 붙잡아 두는 자리, 제목·
본문 서두 지시문이 그날의 구체적인 신호를 가리키고 서식 군더더기를 없애도록
보강하는 자리, 사진 좌표를 대표 장소 이름으로 바꾸는 자리, 완료된 생성 한 번의
소요 시간을 벽시계로 재서 문장으로 옮기는 자리.** 제목의 **화면 표시 배선**(014)은
이미 있었지만, **제목·본문 내용의 품질**은 새로 열어야 하는 문제임이 사용자
피드백(2026-08-23, 두 차례)과 실기기 저장 데이터 직접 확인으로 드러났다 — 원래
계획에서 "이미 완료됨"으로 잘못 판단했던 지점이다.

1. **`caption.ts`가 리사이즈 사본을 즉시 지우지 않는다.** 지금은 그 장의 캡션이
   끝나면(성공·실패 무관) `finally`에서 `cleanup(captionPath)`를 바로 부른다(013
   FR-008). 그러나 캡션 시점에는 그 일기가 판정을 통과할지, 저장될지 아직 모른다 —
   **삭제 여부를 캡션 직후가 아니라 파이프라인 결과가 확정된 뒤로 미뤄야 한다.**
   `captionAll()`이 캡션에 쓴 사본 경로를 `PhotoCaption`에 함께 실어 돌려주고,
   **호출자(`pipeline.ts`)가 판정·저장 결과를 보고 나서** 지킬지 지울지를 정한다.
2. **`prompt.ts`의 지시문이 헤드라인다운 구체성 + 서식 규율을 명시적으로
   요구한다.** 지금 문구("첫 줄에 제목을 짧게 쓰고, 빈 줄을 하나 넣은 뒤...")는
   형식만 말하고 내용·서식을 말하지 않아, 모델이 (a) "{캐릭터}의 오늘일기"류의
   안전한 재조합, (b) 마크다운 기호(`###`, `**...**`) 노출, (c) "빈 줄"이라는
   지시문 낱말을 문자 그대로 되뱉는 본문 첫 줄, (d) 날짜를 반복하는 부제목성
   줄로 채운다 — 실기기에 저장된 실제 일기 두 건에서 전부 실측됐다(research.md
   §9). 012의 "확실하지 않은 것은 짐작의 말투로" 추가와 같은 방식(구체적
   예시+금지어 대신 요구 문장 자체를 보강)으로 고친다. **`judge()`에 다섯 번째
   갈래를 만들지 않는다**(원칙 IV) — 품질 검증은 실기기에서 사람이 읽는다.
3. **`PhotoPlaces`가 대표 좌표 하나를 함께 낸다.** `tracePlaces()`는 지금도 자리
   군집의 대표 좌표(`places: Coordinate[]`)를 내부에서 계산하지만 반환값에서 버린다
   (`places.ts:93`). 그 값 중 **첫 자리**(시각순 첫 군집)를 `PhotoPlaces`에
   `representativeCoordinate?: Coordinate`로 얹는다 — **새로 재는 값이 아니라 이미
   계산하고 버리던 값을 살리는 것**이다(체류 시간처럼 새 축을 재지 않는다, 원칙 IV).
4. **`on-device.ts`의 `generate()`가 두 구간을 벽시계로 잰다.** `readPhotos()` 호출
   앞뒤, `engine.run()`(`runWithTimeout()`) 앞뒤에 `Date.now()`를 놓아 두 소요 시간을
   얻는다. **`runWithTimeout()`의 기존 시간 측정(FR-011의 "재는 것과 기록하는 것은
   다르다" 주석)은 그대로 버려지고, 새 측정을 독립적으로 더한다** — 기존 한도 감시
   로직을 건드리지 않는다.

**설계의 중심**: **세 자리(1·3·4)는 "이미 계산되었으나 버려지던 값을 살린다"는 같은
모양이고, 제목(2)만 성격이 다르다.** 캡션 파일은 이미 만들어져 있었고(013), 대표
좌표는 이미 계산되어 있었고(`tracePlaces()`), 벽시계 시간은 헌법 1.2.0이 방금
허용하기 전까지 잴 이유가 없어 안 재고 있었을 뿐이다. 제목은 값을 살리는 것이 아니라
**프롬프트가 요구하는 것 자체가 불충분했던** 경우다 — 005~012가 반복해서 겪은
"지시문이 무엇을 쓸지는 말했지만 어떻게 쓸지는 말하지 않았다"는 패턴(014의 짐작
어미 지시와 같은 계열)이 여기서 한 번 더 나타난다.

## Technical Context

**Language/Version**: TypeScript ~6.0.3

**Primary Dependencies**: Expo SDK ~57.0.14, React Native 0.86.2, `expo-image-manipulator`
~57.0.12(기존), `expo-file-system` ~57.0.4(기존). **`expo-location`이 새 의존으로
추가된다**(User Story 3, 장소명) — `reverseGeocodeAsync`를 위해서다. 사진 표시·소요
시간(User Story 1·2)은 새 의존 0개.

**Storage**: 파일 기반(변경 없음, `expoFileSystemPort`). `DiaryEntry` JSON에 선택 필드
셋이 늘어난다(사진 참조·소요 시간·장소 이름) — 옛 파일에 없는 키는 옵셔널로 처리되어
읽기가 깨지지 않는다(`store.ts`의 `deserializeEntry`가 이미 이런 왕복을 전제로
설계됨). 리사이즈 사본은 기존 `vision-cache` 디렉터리(`Paths.document`)에 그대로
남고, 지우는 시점만 바뀐다 — 새 디렉터리를 만들지 않는다. 장소명 설정(켜짐/꺼짐)은
`vision-setting-store.ts`와 같은 패턴의 새 파일(`preferences/geocoding-setting.json`)
에 영속화한다.

**Testing**: Jest(기기 불필요), Maestro(실기기 — 사진 있는 하루로 일기를 생성해
본문에 사진·소요 시간 문장이 뜨는지, 별도 흐름에서 장소명 설정을 켜고 좌표 있는
하루로 생성해 장소 이름이 뜨는지 확인). `npm test` / `npm run test:device` /
`npm run lint`. **`expo-location`은 새 네이티브 모듈이므로 이 기능 전체를 debug
실기기에서 최소 1회 재확인해야 한다**(AGENTS.md "새 네이티브 모듈을 건드리면
release 재확인은 그런 경계를 새로 건드릴 때만" — 이번엔 새 네이티브 모듈 자체이므로
debug 1회가 최소선이다).

**Target Platform**: Android 13 (SM-G986N 실기기), arm64-v8a

**Performance Goals**: 해당 없음 — 화면이 사진·소요 시간·장소명을 추가로 보여주는
것이지 생성 속도 자체를 바꾸지 않는다. 다만 **리사이즈 사본을 더 이상 즉시 지우지
않으므로 저장 공간이 늘어난다** — User Story 1의 clarify 결정(B)이 이미 감수하기로
한 트레이드오프다(원본 삭제에도 살아남아야 하므로).

**Constraints**:
- **캡션 시점에 지우던 것을 파이프라인 결과 확정 시점으로 미룬다.** 판정에서 거부되거나
  저장에 실패하면 리사이즈 사본은 **여전히 지운다** — 남기는 것은 실제로 저장된
  `DiaryEntry`가 참조하는 사본뿐이다. 후보로 캡션까지 했으나 결국 쓰이지 않은
  실행(거부·재시도)의 사본이 쌓이면 008이 겪은 "받다 만 모델이 쌓이는" 것과 같은
  종류의 누적이 된다.
- **대표 좌표는 새 관측이 아니다.** `tracePlaces()` 안에서 이미 계산되던 값을
  반환 범위 밖으로 한 겹 넓혀 내보낼 뿐, 새로운 좌표를 추가로 재지 않는다.
- **장소명 지오코딩은 좌표가 있고 설정이 켜진 하루에서, 일기 생성 시점에 딱 한 번
  수행한다**(Assumptions). 화면을 열 때마다 다시 묻지 않는다 — 그 결과를
  `DiaryEntry`에 저장한다.
- **소요 시간은 `on-device.ts`의 두 지점(사진 읽기 시작~끝, `engine.run()` 시작~끝)
  에서만 잰다.** 네이티브 `timings`는 여전히 `llama-port.ts` 경계에서 버려진다
  (원칙 IV) — 이번에 잰 값은 그 경계를 우회하는 것이 아니라 상위 계층이 독립적으로
  잰 별개의 값이다.
- **`DiaryDraft`(`inference/types.ts:61`)와 `DiaryEntry`(`diary/types.ts:80`)의
  "소요 시간·속도를 담지 않는다"는 기존 주석은 헌법 1.2.0 이전의 것이다.** 이번
  기능이 그 주석을 헌법 1.2.0의 경계(사후 1회성·비교 금지·모델 식별자 미동반)에
  맞게 고친다 — 주석을 지우는 것이 아니라 새 경계를 반영해 다시 쓴다.
- **은/는 조사는 016의 `particle.ts`를 확장한다**(같은 파일, 배치임 판정 로직
  재사용). 새 파일을 만들지 않는다.
- **제목 지시문 보강은 `judge()`의 4갈래를 늘리지 않는다.** `TITLE_INSTRUCTION`을
  더 구체적으로 쓰는 것만으로 해결한다 — "일반화된 제목인지"를 코드가 판정해 거부하는
  로직은 추가하지 않는다(원칙 IV, spec FR-010a). `extractTitle()`의 형식 판정
  (한 줄·40자 이하)은 그대로 둔다.
- **`monologue.ts`·`particle.ts`의 기존 격리(roster·persona·Character 미import)는
  이번 기능이 건드리는 화면 쪽(`DiaryDetailScreen.tsx`)에는 적용되지 않는다** —
  상세 화면은 이미 `persona.ts`를 몰라도 `entry.character`(문자열 리터럴)만으로
  이름을 알 필요가 없다. 소요 시간 문장에 넣을 캐릭터 **이름**은 `persona.ts`의
  `personaOf(entry.character).name`에서 얻는다(007·016이 화면 쪽에서 이미 쓰는
  패턴과 동일 — 원칙 III 경계는 화면이 페르소나 계층을 거쳐 지킨다).

**Scale/Scope**: 사진 참조 최대 5장/일기(`selectForVision()`의 상한 그대로), 소요
시간 필드 2개(vision/writing, 각각 밀리초), 장소 이름 문자열 1개(선택). 순수 함수/타입
변경 다수(`vision/caption.ts`·`vision/types.ts`·`signals/places.ts`·
`signals/types.ts`·`diary/types.ts`·`diary/pipeline.ts`·`diary/particle.ts`·
`inference/types.ts`), 어댑터 변경(`inference/on-device.ts`·새
`signals/geocoding-port.ts`·새 `app/geocoding-setting-store.ts`), 화면 변경
(`ui/DiaryDetailScreen.tsx`, 설정 토글 UI 1곳 신설 또는 기존 설정 화면에 추가).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 이 기능과의 관계 | 판정 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | 관계 없음 — 추론 위치나 응답 내용을 건드리지 않는다. `expo-location`의 `reverseGeocodeAsync`는 모델 추론이 아니므로 원칙 I이 금지하는 "원격 추론"에 해당하지 않는다(헌법 로드맵 문서가 이미 이 구분을 명시함) | ✅ 통과 |
| **II. 화자는 휴대폰이고 시야는 좁다** | **감시 대상.** 장소 이름이 프롬프트에도 들어가야 한다(FR-008) — 화면과 일기 본문이 다른 사실을 말하면("두 개의 진실") 이 원칙이 요구하는 정직한 화자상이 깨진다. 소요 시간 문장도 "겪은 사실"만 담아야 하며 지어낸 감상을 섞지 않는다. **제목 지시문 보강도 이 원칙의 적용이다** — "구체적인 장면을 가리키라"는 요구가 "없는 것을 지어내라"로 읽히면 안 된다. FR-010a가 짐작 어미(014가 이미 세운 규칙)를 제목에도 적용하도록 명시한다 | ⚠️ 감시 후 통과 |
| **III. 모델은 캐릭터다** | **감시 대상.** 소요 시간 문장에 캐릭터 **이름**은 들어가지만 모델 식별자·파라미터는 들어가지 않는다(FR-016). `persona.ts`를 거쳐서만 이름을 얻는다 — 016이 진행 문구에서 이미 확립한 것과 같은 경계. 제목 지시문 보강은 캐릭터별 씨앗(말투)을 침해하지 않는다 — "무엇을 담을지"만 구체화하고 "어떻게 쓸지"는 여전히 캐릭터마다 다르게 둔다(spec User Story 2 Scenario 4) | ⚠️ 감시 후 통과 |
| **IV. 측정 장치를 제품에 들이지 않는다** | **가장 큰 위험, 그러나 헌법 1.2.0이 정면으로 다룬다.** 소요 시간은 새로운 "측정"처럼 보이지만 1.2.0이 명시적으로 허용한 사후 1회성 기록이다. 대표 좌표는 새 관측이 아니라 이미 계산되던 값을 살리는 것(Technical Context 참조) — 이 구분을 research.md·data-model.md가 근거로 남긴다 | ⚠️ 감시 후 통과 |
| **V. 관측된 사실과 추측을 구분한다** | 장소 이름은 `SignalValue`처럼 `none`(좌표 없음)/`unknown`(좌표는 있으나 이름 못 얻음)을 구분해야 한다(FR-007). 사진이 지워진 것과 리사이즈 사본이 지워진 것도 서로 다른 사실로 구분한다(clarify 결정) | ✅ 통과 |
| **개발 방식** | 계약을 먼저 정하고(사진 보존 계약, 장소명 계약, 소요 시간 계약) 테스트를 먼저 쓴다 | ✅ 통과 |

**게이트 통과.** 정당화가 필요한 위반이 없으므로 Complexity Tracking은 비운다.

**★ 설계 조사 중 확인해야 할 위험 넷**:

1. **캡션 시점 삭제를 파이프라인 결과 확정 시점으로 미루는 것이 013의 FR-006(원본
   보호)·FR-008(치움)과 실제로 충돌하지 않는가** — `caption.ts`가 `shouldCleanup`을
   `resized.path !== path`로 이미 판정해 두므로(원본과 같은 경로면 지우지 않음), 이
   판정 자체는 그대로 두고 "언제 지우는가"만 옮기면 되는지 research에서 확인한다.
2. **`tracePlaces()`가 이미 계산하는 `places: Coordinate[]`의 첫 원소가 정말
   "대표 장소"로 쓰기에 안전한 값인가** — 시각순 정렬(`ordered[0]`) 기준이라 하루의
   첫 사진이 찍힌 곳이 된다. clarify에서 "가장 오래 머문 자리"도 후보로 제시했으나
   체류 시간을 재려면 새 축이 필요하다(원칙 IV 위험) — research에서 "첫 자리"로
   확정할 근거를 남긴다.
3. **`expo-location`의 `reverseGeocodeAsync`가 안드로이드에서 별도의 런타임 위치
   권한(`ACCESS_FINE_LOCATION`류)을 실제로 요구하는가, 아니면 좌표를 이미 쥐고 있으면
   권한 없이도 응답하는가** — 요구한다면 새 권한 플로우가 필요하고, 거부됐을 때
   FR-007의 `unknown` 경로로 자연스럽게 떨어지는지 실기기에서 확인이 필요하다.
4. **캡션 완료 후 사본을 "지킬지 지울지"를 결정하는 자리가 `pipeline.ts`(저장 성공
   확정)인가 `on-device.ts`(판정 통과 확정)인가** — 013 이후 두 엔진이 서로 몰라야
   한다는 경계(`vision/`는 `diary/store`를 모른다, AGENTS.md)를 지키려면 `on-device.ts`
   가 스스로 지우지 않고 "이 경로들이 후보"라는 사실만 `DiaryDraft`에 실어 올리고,
   최종 지킴/지움 판정은 `pipeline.ts`(저장까지 아는 유일한 자리)가 해야 한다 —
   research에서 정확한 책임 분리를 정한다.

## Project Structure

### Documentation (this feature)

```text
specs/017-diary-body-screen/
├── plan.md                    # 이 파일
├── research.md                # Phase 0 — 삭제 시점 이동의 정확한 책임 분리,
│                               #   대표 좌표 확정, expo-location 권한 실측 계획,
│                               #   DiaryDraft·DiaryEntry 헌법 주석 개정 근거
├── data-model.md               # Phase 1 — PhotoCaption/PhotoVision 확장,
│                               #   PlaceTrace.representativeCoordinate,
│                               #   DiaryEntry 확장 필드 셋, GeocodingSetting
├── quickstart.md               # Phase 1 — 검증 절차 (사진 있는 하루 생성 →
│                               #   본문 사진·소요 시간 확인, 장소명 설정 온/오프)
├── contracts/
│   ├── photo-preservation.md   # Phase 1 — 캡션 사본 삭제 시점 이동 계약
│   ├── title.md                # Phase 1 — 제목 지시문 보강 계약(원칙 II·IV 경계)
│   ├── place-name.md           # Phase 1 — 대표 좌표 → 지오코딩 → 화면·프롬프트 계약
│   ├── elapsed-time.md         # Phase 1 — 벽시계 측정 지점, 문장 조립, 헌법 1.2.0 경계
│   └── particle.md             # Phase 1 — particle.ts에 은/는 추가하는 계약
├── checklists/
│   └── requirements.md         # /speckit-specify + /speckit-clarify 산출
└── tasks.md                    # /speckit-tasks가 만든다 (이 명령이 만들지 않는다)
```

### Source Code (repository root)

```text
src/
├── vision/
│   ├── types.ts                 # ★ 고칠 자리 — PhotoCaption에 리사이즈 사본 경로
│   │                             #   (resizedPath?: string)를 더한다. 원본과 같은
│   │                             #   경로였으면(C1) 이 필드가 없다
│   ├── caption.ts                # ★★★ 고칠 자리 — 그 장이 끝나면 즉시 cleanup하던
│   │                              #   것을 멈추고, 캡션에 성공한 사본 경로를
│   │                              #   PhotoCaption에 실어 돌려준다. 실패한 사본은
│   │                              #   여전히 그 자리에서 즉시 지운다(성공한 것만
│   │                              #   미룰 이유가 있다 — 실패는 이후 아무도 참조하지
│   │                              #   않는다)
│   └── select.ts                 # 변경 없음 — VISION_PHOTO_LIMIT 그대로
├── signals/
│   ├── types.ts                  # ★ 고칠 자리 — PhotoPlaces에
│   │                              #   representativeCoordinate?: Coordinate 추가
│   ├── places.ts                  # ★ 고칠 자리 — tracePlaces()가 places[0]을
│   │                              #   representativeCoordinate로 함께 반환
│   └── geocoding-port.ts           # ★★ 새 파일 — expo-location의
│                                    #   reverseGeocodeAsync를 감싼 포트. 좌표 →
│                                    #   장소 이름 | null(이름 못 얻음)
├── inference/
│   ├── types.ts                  # ★★ 고칠 자리 — DiaryDraft 확장(timing,
│   │                              #   usedPhotos). 헌법 1.2.0 근거로 기존
│   │                              #   "소요 시간을 담지 않는다" 주석을 고쳐 쓴다
│   └── on-device.ts               # ★★★ 고칠 자리 — readPhotos()·runWithTimeout()
│                                   #   앞뒤로 Date.now() 측정, PhotoCaption의
│                                   #   resizedPath를 모아 DiaryDraft.usedPhotos로
│                                   #   실어 올린다(지우지 않는다 — 판정은
│                                   #   pipeline.ts가 한다)
├── diary/
│   ├── types.ts                   # ★★ 고칠 자리 — DiaryEntry 확장(photos:
│   │                              #   PreservedPhoto[], timing, placeName). 헌법
│   │                              #   1.2.0 근거로 기존 주석 개정
│   ├── pipeline.ts                 # ★★★ 고칠 자리 — 6단계(저장) 직전에 사진 보존
│   │                              #   판정(성공 시 유지, 실패 시 정리) + 지오코딩
│   │                              #   호출(설정 켜짐 + 대표 좌표 있음일 때 1회) +
│   │                              #   entry 조립에 새 필드 반영
│   ├── prompt.ts                   # ★★ 고칠 자리 — TITLE_INSTRUCTION을 구체적
│   │                              #   헤드라인 요구 + 마크다운 금지 + "빈 줄"
│   │                              #   낱말 제거 + 본문 시작 지시로 보강
│   │                              #   (judge() 갈래는 늘리지 않는다, FR-010a~d).
│   │                              #   장소명 반영도 이 파일(buildPrompt())의
│   │                              #   몫이다
│   └── particle.ts                 # ★ 고칠 자리 — topicParticleFor(name): "은"|"는"
│                                    #   추가. 배치임 판정 로직을 공유 헬퍼로 추출
├── app/
│   ├── state.ts                   # ★ 고칠 자리 — DiaryListItem은 그대로(제목만
│   │                              #   유지), AppScreen 변경 없음(표시 데이터는
│   │                              #   entry 안에 이미 실린다)
│   └── geocoding-setting-store.ts  # ★★ 새 파일 — vision-setting-store.ts와 같은
│                                    #   패턴, 별도 파일(preferences/
│                                    #   geocoding-setting.json)
└── ui/
    ├── DiaryDetailScreen.tsx       # ★★★ 고칠 자리 — signalLines()를 확장해 사진
    │                              #   썸네일·장소 이름을 반영하고, 소요 시간 문장
    │                              #   렌더링을 더한다("이 일기가 본 것" 절 하단)
    └── GeocodingSettingToggle.tsx   # ★ 새 파일 또는 기존 VisionPicker.tsx 인근
                                     #   설정 화면에 토글 추가 — 켤 때 고지 문구 표시

app/
└── (확인 필요) 장소명 설정을 어디서 노출할지 — VisionPicker.tsx 인근 기존 설정
    화면이 있는지, 없으면 새 화면이 필요한지는 research.md에서 UI 인벤토리를
    확인한다

__tests__/
├── vision/
│   ├── types.test.ts               # ★ PhotoCaption 소스 선언에 resizedPath가
│   │                              #   옵셔널인지
│   └── caption.test.ts              # ★★★ 성공한 캡션의 사본이 즉시 지워지지
│                                   #   않는지, 실패한 캡션(C1 아닌데 결과 빈 문자열
│                                   #   등)의 사본은 여전히 즉시 지워지는지
├── signals/
│   ├── types.test.ts                # ★ PhotoPlaces 소스 선언에
│   │                              #   representativeCoordinate가 옵셔널인지
│   └── places.test.ts                # ★★ 여러 자리를 도는 좌표열에서 첫 자리가
│                                    #   representativeCoordinate로 나오는지,
│                                    #   자리가 하나면 그 하나가 나오는지, 좌표가
│                                    #   없으면 필드 자체가 없는지
├── inference/
│   ├── types.test.ts                # ★ DiaryDraft 소스 선언이 timing·usedPhotos를
│                                   #   옵셔널로 갖는지, GenerationFailure 갈래에는
│                                   #   여전히 없는지(FR-014·016)
│   └── on-device.test.ts             # ★★★ vision·writing 각각의 소요 시간이
│                                   #   합리적 순서로 잡히는지(vision ≤ writing 시작
│                                   #   시각), 사진 0장이면 vision 소요 시간 자체가
│                                   #   없는지(FR-013), usedPhotos가 실제로 캡션
│                                   #   성공한 것만 담는지
├── diary/
│   ├── types.test.ts                # ★★ DiaryEntry 소스 선언이 새 필드 셋을
│                                   #   옵셔널로 갖는지, 모델 식별자·비교 표현이
│                                   #   담길 자리가 없는지(문자열 유니온·숫자만)
│   ├── pipeline.test.ts              # ★★★ 판정 거부·저장 실패 시 리사이즈 사본이
│                                   #   정리되는지(누적 방지), 저장 성공 시에만
│                                   #   entry.photos에 남는지, 지오코딩이 설정
│                                   #   꺼짐/좌표 없음일 때 시도조차 안 되는지
│   ├── prompt.test.ts                # ★★ TITLE_INSTRUCTION 소스 문자열이 구체적
│                                   #   장면·헤드라인을 요구하는 문구를 포함하는지,
│                                   #   재조합 패턴("~의 오늘 일기")을 금지하는
│                                   #   문구가 있는지(내용 검사이지 모델 출력
│                                   #   채점이 아니다 — 원칙 IV, 지시문 자체를
│                                   #   테스트하지 모델 출력을 테스트하지 않는다)
│   └── particle.test.ts              # ★★ 로스터 5인 이름 전부 + 받침 있는
│                                   #   합성 이름에서 은/는이 올바른지(실제 로스터
│                                   #   이름이 전부 받침 없음이므로 합성 케이스
│                                   #   필수 — research.md 확인 사항)
├── signals/geocoding-port.test.ts     # ★★ 좌표 → 이름 성공/실패(null)/예외 세
│                                   #   갈래가 unknown/known으로 올바르게 갈리는지
├── app/geocoding-setting-store.test.ts # ★ vision-setting-store.test.ts와 같은
│                                   #   모양(읽기 실패 시 null, 쓰기 후 왕복)
└── ui/DiaryDetailScreen.test.tsx        # ★★★ 사진 있음/없음/삭제됨, 소요 시간
                                       #   있음/없음(0장), 장소 이름 있음/none/
                                       #   unknown 조합별 렌더링, 모델 식별자·비교
                                       #   문구가 스냅샷에 없는지

.maestro/
└── diary-body-screen.yml            # ★ 새 흐름 — 사진 있는 하루 생성 → 상세
                                     #   화면에서 사진·소요 시간 문장 확인, 별도
                                     #   시나리오로 장소명 설정 켜고 확인
                                     #   (FLOWS 등록 필수)
```

**Structure Decision**: 기존 구조를 그대로 쓴다. 새 계층은 만들지 않는다 — 사진
보존은 `vision/`(캡션 사본을 만드는 자리)과 `diary/pipeline.ts`(최종 판정 자리)에
걸쳐 있고, 장소명은 `signals/`(좌표·자리 계산이 이미 있는 자리)에 지오코딩 포트를
더하는 것으로, 소요 시간은 `inference/on-device.ts`(두 엔진 호출을 이미 감싸고 있는
유일한 자리)에서 잰다. 새 파일은 셋뿐이다(`geocoding-port.ts`,
`geocoding-setting-store.ts`, 화면 토글) — 013이 `resize.ts`를 새로 연 것과 같은
판단으로, 기존 파일에 욱여넣기보다 책임이 분명한 작은 파일을 추가한다.

## Constitution Check — 설계 후 재평가

*Phase 1 산출물(data-model·contracts·quickstart)을 만든 뒤 다시 본다.*

| 원칙 | 설계가 무엇으로 막는가 | 판정 |
| --- | --- | --- |
| **II. 화자는 휴대폰이고 시야는 좁다** | `contracts/place-name.md`가 "화면에 보이는 이름 = 프롬프트에 들어간 이름"을 단일 값으로 강제한다(같은 `DiaryEntry.placeName` 필드를 화면과 `buildPrompt()` 둘 다 읽는다) — 두 개의 진실이 구조적으로 불가능하다. `contracts/elapsed-time.md`가 소요 시간 문장에 감상·추측 표현을 넣지 않는 문장 틀을 고정한다. `contracts/title.md`가 헤드라인 지시문에도 짐작 어미 규칙(014)이 적용됨을 명시한다 — "구체적으로 쓰라"는 요구가 단정형 지어내기로 미끄러지지 않게 한다 | ✅ 통과 |
| **III. 모델은 캐릭터** | `contracts/elapsed-time.md`가 문장 조립을 `persona.ts`의 `name`만 거치도록 못 박고, 모델 식별자·파라미터가 지나갈 자리(타입)가 애초에 없다 — `DiaryDraft.timing`·`DiaryEntry.timing`이 숫자(밀리초) 필드뿐인 순수 데이터라 문자열 삽입 경로가 없다. `contracts/title.md`는 "무엇을 담을지"만 지시하고 캐릭터별 말투(씨앗)는 건드리지 않는다 — 다섯 캐릭터가 같은 헤드라인 요구 아래서도 서로 다른 문체를 유지해야 함을 불변식으로 남긴다 | ✅ 통과 |
| **IV. 측정 장치 금지** | `contracts/elapsed-time.md`가 헌법 1.2.0의 다섯 경계(진행 중 미노출·비교 금지·모델 식별자 미동반·네이티브 지표 미노출·상위 계층 벽시계만)를 항목별로 계약 불변식으로 못 박는다. `contracts/place-name.md`의 `representativeCoordinate`는 새 측정이 아니라 `tracePlaces()`가 이미 계산하던 값의 재사용임을 data-model.md가 실측 근거(코드 인용)로 남긴다. `contracts/title.md`는 제목 품질을 채점하는 코드를 명시적으로 금지하고, 검증 방식을 "프롬프트 지시문 내용 검사 + 사람이 실기기에서 읽기"로 한정한다 | ✅ 통과 |
| **V. 관측된 사실과 추측을 구분한다** | `contracts/place-name.md`가 `none`(좌표 없음)/`unknown`(이름 못 얻음) 구분을 명시하고, `contracts/photo-preservation.md`가 "원본 삭제"와 "보존 사본 삭제"를 서로 다른 실패 사실로 구분한다(clarify 결정 그대로) | ✅ 통과 |

**게이트 재통과.** 설계가 원칙을 약화시키지 않았다 — 소요 시간·대표 좌표 모두 새
측정이 아니라 기존에 계산되고 버려지던 값을 살리거나, 헌법이 명시적으로 연 자리를
좁은 계약으로 채운 것이다.

### 설계에서 새로 드러난 위험 — Phase 0 조사에서 확인·해소

1. **캡션 사본을 "언제까지 살아 있게 할 것인가"의 상한이 없으면 008과 같은 누적이
   생긴다** — 판정 거부·저장 실패 시 즉시 정리하는 경로를 `pipeline.ts`에 명시적으로
   두어야 한다(research §1).
2. **`representativeCoordinate`가 `undefined`인 경우(좌표 자체가 없는 하루)와
   지오코딩이 이름을 못 얻은 경우가 섞이지 않아야 한다** — 전자는 애초에 지오코딩을
   시도하지 않고(FR-009), 후자만 `unknown`이 된다(research §2·§3).
3. **`expo-location`이 새 네이티브 의존이므로 `prebuild --clean`이 다시 필요하다**
   (AGENTS.md 004의 교훈) — quickstart에 매니페스트 권한 확인 단계를 반드시 넣는다.

## Complexity Tracking

> 헌법 위반이 없으므로 비어 있다.
