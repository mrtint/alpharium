# Research: 121 일기가 하루의 장소를 더 풍부하게 말한다

스파이크 실측(2026-11-21)은 설계문서 `docs/superpowers/specs/2026-11-21-richer-day-places-design.md` 「실측 근거」에 있다. 여기서는 구현 갈림길만 정한다.

## R1. 장소 데이터 파일 형식

- **Decision**: 앱 번들 자산 `assets/places/kr-places.bin` 한 파일. 직접 정의한 리틀 엔디언 이진 형식(계약 `contracts/place-index.md` §형식). 좌표는 1e-5도 정수(int32), 다각형 꼭짓점은 첫 점에서의 차이를 int16으로 담는다(1e-5도 ≈ 1.1m, int16 범위 ±0.327도 — 넘는 다각형은 경계 상자만 남기고 꼭짓점을 버린다).
- **Rationale**: 하루 몇 번의 조회에 SQLite·새 네이티브 의존성은 과하다. 고정 폭 이진은 `Int32Array`/`DataView`로 파싱이 빠르고 JS 힙에 문자열을 늘어놓지 않는다(이름만 필요할 때 디코딩).
- **Alternatives**: JSON(크기·파싱 메모리 큼), gzip(앱 번들이 이미 압축되고 RN에 inflate가 없다), SQLite R-tree(새 네이티브 모듈).

## R2. 번들 자산을 읽는 길

- **Decision**: `expo-asset`(이미 `expo`의 의존성 57.0.20 — `npx expo install expo-asset`으로 직접 의존성으로 올린다)의 `Asset.fromModule(require(...)).downloadAsync()`로 로컬 경로를 얻고, `expo-file-system` `File(localUri).bytesSync()`로 읽는다. `metro.config.js`에 `assetExts.push("bin")`. 읽기는 포트 하나(`src/signals/place-index-port.ts`)에만 두고, 테스트는 Node `fs`로 같은 파일을 읽는 포트를 쓴다.
- **Rationale**: `File`의 비동기 호출은 금지(AGENTS — GC 문제). 번들 자산을 파일 경로로 얻는 표준 길이 `expo-asset`이다. 새 네이티브 모듈이 아니다(이미 링크되어 있다).
- **Alternatives**: base64 JS 모듈로 넣기(수 MB 문자열이 Hermes 힙·번들에 실린다), 필수 모듈 내려받기(설계에서 기각).

## R3. 데이터 만들기

- **Decision**: 저장소 밖 도구 `osmium-tool`(Homebrew)로 `osmium tags-filter`(설계의 태그 집합) → `osmium export -f geojsonseq`, Node 스크립트 `scripts/places/build-place-index.mts`가 범주 판정·한글 거르기·Douglas–Peucker 단순화(허용 오차 1e-4도 ≈ 10m)·이진 묶기를 한다. 기록은 `assets/places/kr-places.meta.json`(원본 URL·Last-Modified·바이트 수, 결과 sha256·곳 수·범주별 수, 만든 날짜). 범주 판정·묶기는 순수 함수(`scripts/places/categorize.ts`·`pack.ts`)로 두고 테스트한다. 원본 `.pbf`는 저장소에 넣지 않는다(gitignore된 캐시).
- **Rationale**: 저장소 툴체인이 Node/TS다. 무거운 PBF 해석은 검증된 CLI에 맡긴다. 스파이크의 등간격 추림이 긴 공원(망원한강공원·여의도)을 틀리게 해서 형태를 지키는 단순화로 바꾼다.
- **Alternatives**: pyosmium(스파이크에서 썼지만 Python 의존이 저장소에 새로 생긴다), Node PBF 파서(추가 의존성·느림).

## R4. 이름 고르기와 색인

- **Decision**: 파싱한 데이터에 격자 색인(0.01도 칸)을 만든다. 점 장소는 그 칸에, 다각형은 경계 상자가 덮는 칸마다 넣되, 64칸을 넘는 큰 다각형(국립공원 등)은 「큰 것」 목록에 따로 두고 늘 훑는다. 조회는 점 주변 3×3칸(지명은 1.5km라 5×5) + 큰 것 목록. 고르는 순서는 spec FR-003, 거리 상수는 `place-names.ts` 한 곳에(사람이 정한 값 주석). 「안에 있다」는 다각형 짝홀 판정, 「가장 크다」는 경계 상자 넓이(도² — 비교에만 쓴다).
- **Rationale**: 하루 3~수십 번 조회라 색인을 만드는 비용(수만 항목 한 번)이 지배한다. 3×3칸이면 250~300m 반경을 늘 덮는다(0.01도 ≈ 0.9~1.1km).
- **Alternatives**: 전수 탐색(22만 × 다각형 — 조회마다 수백 ms), R-tree(구현량 대비 이득 없음).

## R5. 프롬프트 문장

- **Decision**: `prompt.ts`의 E2SN(문장형) 경로에서 「다녀온 곳은 ○○ 근처였어요.」를 걷고 자리 줄 하나로 바꾼다.
  - 한 항목: 「사진은 아침에 판교역 근처에서 찍혔어요.」
  - 여러 항목: 「사진은 아침에 판교역 근처, 낮에 서울숲 근처, 저녁에 망원한강공원 근처에서 찍혔어요.」
  - 넘침: 뒤에 「그 밖에 두 곳에서도 찍혔어요.」
  - 이름 없음: 「이름을 모르는 곳」(「~근처」를 붙이지 않는다).
  옛(비 E2SN) 경로의 `placeNameLine`도 같은 조각 함수로 바꾼다(문장체 「찍혔다」).
- **Rationale**: 사실은 「사진이 그 근처에서 찍혔다」까지(원칙 II), 짐작은 모델 몫. 기존 `S_PLACES`(「이 자리들은 사진이 찍힌 지점이지 하루의 궤적은 아니에요.」)가 이미 한계를 말한다. 새 문장은 v5에서 잰 문장이 아니다(원칙 V — 코드 주석에 적는다).
- **Alternatives**: 자리마다 한 줄(2B 모델에 줄이 늘어 꼬리 지시가 묻힌다).

## R6. 설정 두 갈래

- **Decision**: 파일(`geocoding-setting-store.ts`)·타입(`GeocodingPreference`)·함수 이름은 그대로 두고 값 유니온만 `"on" | "off"`로 좁힌다(이름을 바꾸면 조립부 수십 곳이 흔들린다). 주석의 「지오코딩」 설명은 고친다. 파이프라인·생성 매개변수의 켬 여부는 `placeNamesEnabled`로 개명한다. 읽기: `"auto"`·`"on"`·구형 `{enabled:true}`·파일 없음·깨짐 → `"on"`, `"off"`·`{enabled:false}` → `"off"`. 대화상자는 「켬」/「끔」 두 칸, 고지 문구는 「장소 이름은 휴대폰 안의 지도 자료에서 찾아요.」류로 바꾼다. `resolve-generation.ts`의 `locationPermission` 입력과 App의 `expo-location` 권한 읽기를 걷는다.
- **Rationale**: 소유자 결정. 타입 이름까지 바꾸는 것은 범위 대비 위험이 크다 — 경계를 좁히는 일이라 `tsc` 0을 완료 조건으로 한다(AGENTS).
- **Alternatives**: 타입·파일 개명(diff만 커진다).

## R7. 위치 권한 걷기

- **Decision**: `requirements.ts`에서 `location` 항목·`PermissionKey`의 `"location"`을 걷고 order를 다시 매긴다. `location-permission-port.ts`·`geocoding-port.ts` 삭제, `OnboardingScreen`·`permission-tags`·`use-permission-tags`·설정 권한 행에서 `location` 제거. `package.json`에서 `expo-location` 제거, `app.json` 플러그인 항목 제거, `android.blockedPermissions`에 `ACCESS_FINE_LOCATION`·`ACCESS_COARSE_LOCATION`·`ACCESS_BACKGROUND_LOCATION` 추가. `ACCESS_MEDIA_LOCATION`(사진 좌표)은 그대로. 소스 계약: `expo-location` import·`reverseGeocodeAsync`·`getForegroundPermissionsAsync` 0건, `PERMISSION_REQUIREMENTS`에 `location` 없음, iOS 설정에 `NSLocation*` 없음.
- **Rationale**: spec FR-009·FR-010. 065가 같은 방식(blockedPermissions)으로 권한을 막았다. 네이티브 변경이라 `expo prebuild --clean` 뒤 `dumpsys package`로 확인한다(AGENTS).
- **Alternatives**: 모듈은 두고 호출만 걷기(쓰지 않는 네이티브 모듈과 권한 선언이 남는다).

## R8. 방침·문서

- **Decision**: `__tests__/privacy/outbound.ts`에서 `place-name` 항목을 걷고(순서: 방침 → 선언 초안 → 표), 방침 「장소 이름」 절을 「기기 안 지도 자료에서 찾고 좌표를 보내지 않는다」로 고친다. 지원 FAQ 「장소 이름을 끄고 싶어요」 답을 고친다. 스토어 선언 초안의 위치 줄을 「수집 안 함」으로 고치되 콘솔 입력은 소유자 몫으로 남긴다. 라이선스 페이지(`site/licenses/`)에 OpenStreetMap(ODbL) 항목을 더한다(© OpenStreetMap contributors, 가공 파일 경로). 기존 계약 테스트(`policy-facts`·`site-pages`·`licenses`)가 요구하는 표식을 따른다.
- **Rationale**: spec FR-014.

## R9. 저장 모양

- **Decision**: `DiaryEntry.places?: SavedPlace[]` — `{ label: string | null; category: PlaceCategory | null; firstSeenAt: string; lastSeenAt: string; photoCount: number }`(ISO 문자열). 좌표는 저장하지 않는다. 이름 설정이 「끔」이면 `label`·`category`는 `null`로 남긴다(자리·때·사진 수는 남는다). 옛 `placeName`은 읽기만 유지.
- **Rationale**: 화면 과제가 읽을 최소한(YAGNI). 좌표는 사진에 이미 있고, 일기 파일은 OS 백업에 포함되므로 새로 늘리지 않는다.
- **Alternatives**: 좌표 저장(지도 과제를 하지 않기로 했다 — 필요해지면 그 과제가 더한다).

## R10. 이름 찾기 실패

- **Decision**: 데이터 읽기·파싱이 던지면 그 프로세스에서 한 번 실패로 기억하지 않고(다음 일기에서 다시 시도), 이번 일기의 모든 자리 이름을 `unknown`으로 둔다. 파이프라인은 이름 없이 계속한다. 판정 갈래·실패 갈래를 늘리지 않는다.
- **Rationale**: spec FR-015, 원칙 V.
