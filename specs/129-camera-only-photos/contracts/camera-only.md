# Contract: 카메라 사진 판정 (`src/signals/camera-only.ts`)

- **CO1** `isCameraPhoto(facts, { allowSeed })`만 판정한다. 기준 상수는 export하지 않는다.
- **CO2** 이름이 `screenshot`으로 시작(대소문자 무시)하거나 `height/width ≥ 2`(둘 다 알 때만)면 제외.
- **CO3** `localPath`가 있으면: 볼륨 루트(`/storage/<v>/`, `/sdcard/`) 뒤 상대 경로가 `DCIM/`으로 시작하고 첫 하위 폴더가 화면 캡처 폴더가 아니면 카메라. `Pictures/PocketlogSeed/`는 `allowSeed`일 때만 카메라. 그 밖은 제외.
- **CO4** `localPath`가 없고 `mediaSubtypes`가 있으면: `screenshot` 포함 시 제외, 아니면 카메라.
- **CO5** 둘 다 없으면 제외(원칙 V).
- **CO6** `allowsSeedPhotos(resolution)`: `resolution.ok && resolution.environment !== "prod"`.

# Contract: 수집 (`collect.ts`)

- **CC1** `collectDaySignals(port, day, options?)` — `options.allowSeed` 기본 `false`(안전한 쪽).
- **CC2** 순서: 권한 → 조회 실패 → 시각 거르기 → 카메라 판정 → 0장이면 `none`.
- **CC3** 장소는 판정을 통과한 사진의 좌표만 묻는다.

# Contract: 헌법 검사 `checkSeedPhotoFile`

- **SP1** `src/` 안에서 문자열 `PocketlogSeed`는 `src/signals/camera-only.ts`에만.
- **SP2** `allowsSeedPhotos(` 호출은 `src/app/wiring.ts`에서만(정의 파일 제외).
- **SP3** `camera-only.ts`는 `process.env`·`config/environment` import를 하지 않는다.
- 기존 `checkPhotoPortFile`은 `camera-only` import와 `isCameraPhoto`도 잡는다(기기 계층 판정 금지).
