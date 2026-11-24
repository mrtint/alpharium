# Research: 129

## R1 안드로이드 출처를 싸게 읽기

- **Decision**: `expo-media-library/legacy`의 `getAssetsAsync({ mediaType: "photo", createdAfter, createdBefore, first, after, sortBy: creationTime })`. 안드로이드는 한 커서에서 `uri = "file://" + _data`(전체 파일 경로)와 `albumId`(BUCKET_ID)를 싣는다(설치본 `AssetUtils.kt` 직접 확인). 사진마다 `getUri()` 0회.
- **Rationale**: 새 API `exeForMetadata`의 `AssetMetadata`에는 경로·버킷이 없다. 앨범 단위 `getUri()` 한 장 방식보다 호출이 적다.
- **Alternatives**: (a) 새 API + 앨범마다 `getUri()` 한 장 — 호출이 남는다. (b) BUCKET_ID를 경로 해시로 역산 — 비공개 구현에 기댄다. (c) 네이티브 모듈 — 기준 위반.
- **주의**: `_data`는 Android 10+에서 폐기 예고지만 MediaStore가 여전히 채운다(Android 14·16 실기기에서 본다). 비면 출처 모름 → 제외.

## R2 iOS 출처

- **Decision**: 같은 레거시 조회의 `mediaSubtypes`에 `screenshot`이 있으면 제외. 기기 정보(EXIF Make/Model)는 읽지 않는다 — 2B의 조건(비용 감당) 불충족.
- **Rationale**: iOS의 EXIF는 `getAssetInfoAsync`(`requestContentEditingInput`)로만 얻는다. 이것은 2026-11-09 백그라운드 멈춤의 원인 호출과 같아 사진마다 부르는 것은 비용(시간)뿐 아니라 멈춤 위험이다. 비용을 잴 필요 없이 조건이 깨진다.
- **한계**: 사파리·메신저에서 저장한 사진은 iOS에서 카메라 사진과 같은 꼴(이름 `IMG_…`, 종류 없음)이라 남는다. quickstart에 기록.
- **iOS `uri`**: 레거시 iOS `uri`는 `ph://` — 폴더 의미가 없어 판정에 쓰지 않는다.

## R3 안드로이드 기준(1B)

- **Decision**: 경로의 저장소 루트 뒤 상대 경로가 `DCIM/`으로 시작(대소문자 무시)하면 카메라. 단 첫 하위 폴더가 `Screenshots`·`Screen recordings`·`ScreenRecorder`면 제외. 루트는 `/storage/<볼륨>/`(`emulated/0` 포함)을 벗겨 얻는다(SD 카드 `DCIM`도 인정). 시딩 `Pictures/PocketlogSeed/`는 `allowSeed`일 때만.
- **Rationale**: 삼성 스크린샷이 `DCIM/Screenshots`, 퀵셰어 `Download/Quick Share`, 메신저 `Pictures/KakaoTalk` 등은 DCIM 밖.

## R4 플랫폼 구분

- **Decision**: 판정은 플랫폼을 묻지 않고 사실로 가른다: `localPath`가 있으면 경로 규칙, 없고 `mediaSubtypes`가 있으면(빈 배열 포함) iOS 규칙, 둘 다 없으면 출처 모름 → 제외.
- **Rationale**: 순수 함수로 두 플랫폼을 같은 테스트에서 잠근다.

## R5 128 읽기 전 판정 이전

- **Decision**: 이름 `screenshot*`·세로/가로 ≥ 2를 `camera-only.ts`로 옮겨 두 플랫폼 공통으로 적용(iOS 스크린샷 종류가 빠진 경우의 보강). `caption.ts`의 `looksLikeScreenCapture`와 그 테스트를 걷는다. `unreadable`은 읽은 뒤 판정만 센다.

## R6 시딩 인정 경로

- **Decision**: `allowsSeedPhotos(resolution) = resolution.ok && environment !== "prod"`를 `camera-only.ts`에 두고, `createAppPipeline`이 `loadSignals` 기본값을 만들 때 한 번 부른다(백그라운드·화면·미리보기가 모두 이 파이프라인을 쓴다, 048 PV4).
- **iOS 시딩**: `ios:seed`는 보관함에 넣고 EXIF 판정이 없으므로 예외가 필요 없다. 다만 시딩 사진 비율이 2 이상이면 빠진다(템플릿은 4:3).

## R7 층 1·seed:day

- `seed:day`는 023 확인용으로 일부를 `Pictures/Screenshots`·`Download`에 심는다 — 이제 그 장들은 재료에서 빠지는 것이 기대값이다. 층 1 흐름이 장수 문구를 단정하면 기대값을 고친다(구현 때 grep).
