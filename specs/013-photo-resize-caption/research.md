# Research: 사진을 보기 전에 줄인다

## R1. 무엇으로 리사이즈하는가

**Decision**: `expo-image-manipulator`(신규 의존, Expo SDK 57 공식 릴리스, `npm view`
확인 — `57.0.0`~`57.0.12` 존재).

**Rationale**: `ImageManipulatorContext.resize({ width, height })` + `renderAsync()` +
`saveAsync({ format: SaveFormat.JPEG })`로 리사이즈·저장이 끝난다. 이미 설치된
`llama.rn`·`expo-media-library`와 같은 Expo 관리 패키지 계열이라 `expo install`이
버전을 해석해 준다(AGENTS.md 「Expo 작업 시」 규칙).

**Alternatives considered**:
- **네이티브에서 직접 리사이즈**(`llama.rn`의 `initMultimodal`에 리사이즈 옵션이
  있는지) — 없다. 004의 조사(vision-port.ts 주석)에서 `image_max_tokens`가 이미
  최대치이며 그 이상 축소하는 옵션이 네이티브에 없음을 확인했다(AGENTS.md 013 실측
  기록).
- **손으로 JPEG 디코드/리사이즈**(010의 EXIF 패치처럼 바이트 조작) — 010이 이미
  「손으로 만든 EXIF를 안드로이드가 무시한다」로 이 접근의 위험을 기록했다. 픽셀
  리샘플링은 EXIF 패치보다 훨씬 복잡해 같은 함정이 더 크게 반복될 것으로 본다.

## R2. 리사이즈 사본을 어디에 두는가 — 캐시 vs 문서 디렉터리의 충돌

**Decision**: `expo-image-manipulator`의 `saveAsync()`는 **캐시 디렉터리에만
저장한다**(Expo 공식 문서, `ImageRef.saveAsync()`: "Saves the image to the file
system in the cache directory"). clarify에서 "앱 전용 문서 디렉터리(OS가 안
건드림)"로 결정했으므로(FR-007), **저장 직후 `expo-file-system`의
`File.move(Paths.document 하위)`로 옮긴다.**

**Rationale**: 새 의존을 늘리지 않고 두 요구사항을 다 만족한다 — 리사이즈는
`expo-image-manipulator`가, "OS가 안 건드리는 자리로 옮기는 것"은 이미 설치된
`expo-file-system`이 한다. `File`/`Paths` API는 002·011이 이미 실기기에서 검증한
경로다(AGENTS.md 「expo-file-system 57 API」).

**Alternatives considered**:
- **캐시에 그대로 둔다** — clarify 결정(FR-007: "OS가 앱이 모르는 사이에 지울 수
  있는 자리도 아니다")과 정면으로 어긋난다. 캐시는 OS가 저장공간 부족 시 임의로
  비울 수 있어 "앱이 파일의 생애를 전적으로 책임진다"를 만족하지 못한다.
- **`manipulateAsync`(레거시 API)로 saveOptions에 경로를 직접 지정** — SDK 57
  공식 문서가 신규 API(`manipulate()` + context)를 기본으로 안내하고, 레거시
  API의 `saveOptions`에도 임의 경로 지정 옵션은 없다(포맷·압축률만 받는다).

## R3. 파일 이름 충돌을 어떻게 피하는가

**Decision**: 리사이즈 사본의 파일명은 **원본 `Photo.id`를 그대로 재사용**한다
(예: `<앱 문서 디렉터리>/vision-cache/<photo.id 해시>.jpg`). 같은 하루를 두 번
생성해도 같은 사진이면 같은 이름으로 덮어써지므로 파일이 누적되지 않는다.

**Rationale**: 011의 `captionAll()`이 한 장씩 순차 처리하므로(E1 — 동시성 없음)
경합이 없다. 파일명을 사진 id에서 결정론적으로 유도하면 **정리 실패가 있어도
다음 실행이 같은 이름을 덮어써 누적을 막는다** — FR-009("치우지 못한 것이 남아도
다음 생성이 실패하지 않는다")를 파일명 전략만으로 만족시킨다.

**Alternatives considered**:
- **매번 새 임의 이름(uuid 등) 생성** — 정리에 실패하면 파일이 계속 누적된다.
  008이 겪은 "받다 만 모델 셋이 기기에 남아 치울 길이 없다"와 같은 함정이다.

## R4. EXIF 방향을 어떻게 지키는가

**Decision**: `expo-image-manipulator`가 EXIF 방향을 자동 적용하는지 **공식 문서로
확인되지 않았다**(원칙 V — 확인 안 된 것을 확인됐다고 적지 않는다). **quickstart에서
방향이 있는 실사 사진으로 실측한다.**

**Rationale**: 011의 실측(AGENTS.md)이 이미 "리사이즈 없이도" 실사 캡션이 정확했음을
보였다(붉은 선반·투명 화병). 리사이즈가 그 정확도를 깨뜨리는지는 방향 정보가 있는
사진으로 직접 재는 것 외에 확인할 방법이 없다.

**Fallback (실측에서 뒤집힌 방향이 확인되면)**: `context.rotate(degrees)`를
`resize()` 전에 EXIF 방향값에 따라 명시적으로 적용한다. `expo-media-library`의
`Asset.getOrientation()`(iOS만 지원, 문서 확인)이 아니라 **안드로이드는 EXIF를
직접 읽어야 하며**, 010이 이미 손으로 EXIF를 파싱한 경험(`scripts/seed/exif.ts`)이
있어 그 코드가 참고가 된다 — 다만 그것은 개발 도구이지 제품 코드가 아니므로
직접 재사용하지 않고 필요한 최소 로직만 `src/vision/`에 새로 작성한다.

## R5. 리사이즈 실패를 어떻게 판정에 흡수하는가

**Decision**: `resizePhoto()`가 실패하면 **원본 경로를 그대로 캡션에 넘기지 않고
`null`을 반환**하며, `caption.ts`의 `captionAll()`이 011의 E4 규칙(못 읽은 사진은
건너뛰고 나머지는 계속)으로 흡수한다 — `PhotoPathResolver`가 이미 `string | null`을
반환하는 구조와 동일하게 맞춘다.

**Rationale**: 011의 `captionAll()`이 이미 "경로를 얻지 못하면 이 장은 읽지 못한
것"으로 처리하는 코드가 있다(`caption.ts`의 `resolvePath` 실패 분기). 리사이즈
실패를 같은 분기에 태우면 **새 실패 갈래를 만들지 않고 기존 구조를 재사용**할 수
있다 — FR-019("판정 갈래를 늘리지 않는다")를 구조로 지킨다.

**Alternatives considered**:
- **리사이즈 실패 시 원본 경로를 그대로 캡션에 넘긴다**(줄이지 못했지만 계속
  시도) — 리사이즈가 실패하는 사진은 대개 손상되었거나 형식이 이상한 경우이며,
  원본을 그대로 네이티브에 넘기면 011이 겪은 "조용한 실패"(D2 결함, 92ms에
  "처리"되고 아무것도 안 봄)가 재현될 위험이 있다. 명시적으로 건너뛰는 쪽이 안전하다.

## R6. 기기 안 리사이즈 비용을 언제 재는가

**Decision**: FR-021이 요구하는 실측은 **quickstart.md의 검증 시나리오 안에서**
한다 — 013의 구현이 끝난 뒤 실기기에서 `adb logcat`으로 리사이즈 단계의 소요 시간을
캡션 전체 시간과 함께 재고, AGENTS.md에 기록한다. **plan 단계에서는 짐작만
남긴다**(디코드가 230ms로 실측됐으므로 리사이즈도 비슷한 자릿수로 본다, spec
Assumptions에 이미 기재됨).

**Rationale**: 헌법 원칙 V — 재지 않은 것을 결론짓지 않는다. plan은 무엇을 잴지
정하는 단계이지 재는 단계가 아니다.
