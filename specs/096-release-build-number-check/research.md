# Research: 096 릴리스 빌드 번호 사전 점검

## R1. Play에서 마지막 `versionCode`를 어디서 읽는가

- **Decision**: `edits.insert`로 편집을 열고 `GET …/applications/{pkg}/edits/{editId}/bundles`(`edits.bundles.list`, scope `androidpublisher`)의 `bundles[].versionCode` 최댓값을 쓴다. 읽은 뒤 `edits.delete`로 편집을 버린다(성공·실패 무관, 삭제 실패는 삼킨다).
- **Rationale**: `versionCode`는 트랙을 통틀어 단조 증가해야 하므로 트랙별 목록(`tracks.list`)은 다른 트랙·트랙에 안 올린 번들을 놓친다. 공식 문서(developers.google.com/android-publisher/api-ref/rest/v3/edits.bundles/list, 2026-10-22 확인): 요청 본문 없음, 응답 `bundles[]`는 앱의 모든 번들. `edits.insert`·`edits.delete`는 업로드(076)가 이미 쓰는 호출이다.
- **Alternatives**: `edits.tracks.list`(위 이유로 불완전). `edits.apks.list`(AAB 전용이라 무관).
- **미실측**: 서비스 계정이 `bundles.list`를 할 권한이 있는지(업로드 권한과 같은 범위로 보이나 처음 돌릴 때 안다), `versionCode`가 응답에서 JSON 정수로 오는지(문서 페이지에 필드 형식이 없음 → 정수가 아니면 실패로 처리, 숫자 문자열은 받지 않는다).

## R2. App Store Connect에서 이 버전의 마지막 빌드 번호를 어디서 읽는가

- **Decision**: `GET /v1/apps?filter[bundleId]=…`로 앱 id를 얻고(`testflight-notes`가 쓰는 호출), `GET /v1/builds?filter[app]=<id>&filter[preReleaseVersion.version]=<expo.version>&limit=200`을 `links.next`가 없을 때까지 따라가 `attributes.version`을 모은다. 정수로 읽히는 값의 최댓값을 쓴다.
- **Rationale**: Apple은 같은 `CFBundleShortVersionString` 안에서 빌드 번호가 증가해야 한다. `testflight-notes`가 이미 `filter[version]`·`filter[preReleaseVersion.version]`로 `builds`를 부르므로 키 역할이 조회에 충분하다는 가정은 같은 종류의 호출이다. 서버 정렬(`sort=-version`)은 문자열 정렬일 수 있어 쓰지 않고 내려받아 센다.
- **Alternatives**: `sort=-uploadedDate limit=1`(업로드 순서 ≠ 번호 순서일 수 있음). `filter[expired]`로 거르기(만료된 빌드 번호도 재사용 못 한다 — 거르지 않는다).
- **미실측**: 실제 응답의 `links.next` 형식·페이지 크기 한도, 키 역할이 `builds` 조회를 허용하는지(`testflight-notes`는 한 번도 실제 응답을 본 적이 없다고 AGENTS가 적는다).

## R3. 워크플로 어디에 넣는가

- **Decision**: 안드로이드는 `설정 점검` 뒤, iOS는 `릴리스 노트 점검` 뒤, 둘 다 `npm ci` 앞. 단계는 `node …/…-check.mts`를 부르는 한 줄이다. 기존 「사전 점검」은 건드리지 않는다(076 W17 — 비밀이 비었는지만 보고 저장소 코드를 부르지 않음).
- **Rationale**: `npm ci` 앞이면 의존성 설치 스크립트가 비밀을 보지 못한다. 스크립트가 Node 내장만 쓰므로 설치 없이 돈다. 업로드 단계가 같은 비밀로 같은 종류의 저장소 코드를 이미 돈다.
- **Alternatives**: 사전 점검 안에 넣기(W17 계약 약화 → 거절). 업로드 직전(빌드 후라 목적 상실).

## R4. 스토어를 못 읽을 때

- **Decision**: 실패(소유자 결정 2026-10-22). 403이면 한 줄 덧붙인다: Play는 「서비스 계정에 앱 정보 보기·릴리스 보기 권한」, ASC는 「API 키 역할(App Manager 이상)」.
- **Rationale**: 조용한 건너뜀은 원칙 V에 반한다. 우회 입력은 YAGNI.

## R5. 번호와 커밋의 대응

- **Decision**: 진입점이 통과 시 `버전 <v> · versionCode|빌드 <n> · 커밋 <sha7> · 스토어 마지막 <m|없음>` 한 줄을 표준 출력에 쓰고, 워크플로 단계가 `tee -a "$GITHUB_STEP_SUMMARY"`로 요약에 남긴다. 커밋은 `--commit "$GITHUB_SHA"` 인자로 받는다(비밀 아님).

## 못 본 것

| 항목                                   | 이유                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| Play `bundles.list` 실응답·권한        | 서비스 계정 JSON이 보호 환경에만 있고, 릴리스 워크플로 실행은 소유자 요청 때만 한다 |
| ASC `builds` 페이지 이어받기·역할 권한 | 같음                                                                                |
