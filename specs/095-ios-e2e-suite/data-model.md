# Data Model: iOS e2e 세트 (095)

개발 도구의 값 모양이다. 앱 데이터 형식은 바꾸지 않는다.

## 기준 상태 (BaselineState) — 기존, 변경 없음

`scripts/layer1/baseline.ts`의 `BASELINE` 표(`preferences/*.json` 쓰기·삭제·유지)와 `buildFixtureDiaries(now)`(오늘부터 사흘 쓴 날), `fixturePhotoNames(now)`(`vision-cache/` 사본)로 이루어진다. 두 플랫폼이 같은 표를 쓴다. 경로는 모두 앱 데이터 루트(안드로이드 `files/`, iOS `Documents/`) 기준 상대 경로다.

## IosSimulatorDevice (`Layer1Device` 구현)

| 필드/동작 | 의미 |
| --- | --- |
| `serial` | 부팅된 iOS 시뮬레이터 UDID |
| `listDevices()` | `simctl list devices booted`의 iOS 시뮬레이터 UDID들. `xcrun`이 없으면 null |
| `probe(udid)` | `get_app_container data`가 성공하고 `Documents/`가 있다 |
| `listDir/writeFile/copyFile/removeFile` | 컨테이너 `Documents/<상대경로>`에 호스트 파일 연산. 경로 안전 검사(안드로이드와 같은 정규식) |
| `forceStop(udid)` | `simctl terminate` (실행 중이 아니어도 성공) |
| `runMaestro(flows, env)` | `maestro --device <UDID> test …` (JUnit 보고서로 실패 흐름 이름 수집) |

앱 삭제·재설치·`simctl erase`·모델 삭제 연산은 이 타입에 없다(계약 I-1, 소스 계약 테스트).

## IosSampleDevice (`SampleDevice` 구현)

`pushDir`(= `simctl addmedia`로 폴더 안 사진 심기), `scanVolume`(no-op: 보관함이 즉시 반영), `queryRows`(시뮬레이터 `Photos.sqlite` 읽기 전용 질의 — 이름이 `s30-`로 시작하는 행의 촬영 시각), `readMarker/writeMarker`(호스트 쪽 표식 파일 — 시뮬레이터 UDID별, 개발 기계에는 기록을 두지 않는다는 070 결정과 충돌하므로 **표식은 시뮬레이터 데이터 폴더 안**에 둔다), `removeSampleFiles`(**없음 → 표본이 어긋나면 중단**, research R4).

## IosDeviceTarget (층 2 실기기)

| 필드 | 의미 |
| --- | --- |
| `udid` | `devicectl list devices`에서 연결된 iPhone(`available (paired)`). 둘 이상이면 중단 |
| 컨테이너 | `--domain-type appDataContainer --domain-identifier com.a810labs.pocketlog` |
| `probe` | 컨테이너 목록(`info files`)이 성공하고 `Documents/`가 있다 |
| `listDir(rel)` | `info files --json-output`을 파싱해 `Documents/<rel>`의 직접 자식 이름들 |
| `pullFile(rel, local)` | `copy from --source Documents/<rel>` |
| `writeFile/copyFile` | 호스트의 스테이징 폴더에 쓰고 해당 디렉터리를 `copy to`로 올린다 |
| `removeFile` | `devicectl`에는 파일 삭제 명령이 없다(`copy to`/`from`뿐 — 실측). 디렉터리 단위 `--remove-existing-content true`로 올려서 지운다: 스테이징 폴더에서 파일을 빼고 그 디렉터리를 통째로 올린다 |

**스테이징**: `preferences/`·`diary/`·`vision-cache/` 세 디렉터리만 호스트에 미러링해 수정하고 올린다. `models/`는 읽기만 하며 올리거나 `--remove-existing-content`를 쓰지 않는다(모델 보존 — I-1). 이 디렉터리 단위 교체는 기준 상태 단계(앱이 꺼진 동안)에서만 일어난다.

## Layer2IosFlow (iOS 층 2 흐름 정의)

안드로이드 `Layer2Flow`에서 `file`(Maestro YAML)을 빼고 사람 개입 정보를 더한 모양이다.

| 필드 | 의미 |
| --- | --- |
| `id` | `write-and-read`, `open-app-writes`, `diagnostics-try-write`, `first-run-auto-diary` |
| `story` | 지키는 기능 한 줄(대응표 「층 2」 열과 같은 말) |
| `preferenceOverrides(now)` · `deleteFiles` · `absentDays` · `writtenDay` | 안드로이드 `Layer2Flow`와 같은 뜻 |
| `seedsPhotos` | `ios:seed`가 필요한가(사진 있는 날) |
| `humanSteps` | 사람이 할 조작 안내문(순서 있는 목록). 비어 있으면 완전 자동 |
| `operationTimeoutMs` | 조작 대기 한도(기본 5분) |
| `generationTimeoutMs` | 일기 파일 생성 대기 한도(10분) |

## 층 2 실행 결과 (Layer2IosResult)

`status`: `passed | failed | skipped | aborted`. 흐름별 `outcome`: `passed | failed-operation-timeout(Enter 없음) | failed-generation-timeout(Enter 뒤 파일 없음) | failed-write-failure(기록 있음) | aborted-precondition`. `collected`: 가져온 일기 파일의 개발 기계 경로. 조작 대기 초과와 생성 초과는 서로 다른 값이다(FR-010).

## 상태 전이 (층 2 흐름 하나)

```
준비(기준 상태·사진 시딩) → 앱 실행
  → [humanSteps 있음] 안내 출력 → 사람이 조작 후 Enter (operationTimeoutMs 5분)
  → 일기 파일 폴링 5초 (generationTimeoutMs 10분) → 일기 파일 출현
  → 형식·실패 기록 단언 → 수집 → 다음 흐름
```

쓰는 중은 파일로 보이지 않는다(research R7). 그래서 「조작했다」는 사람의 Enter가 유일한 신호다. Enter가 5분 안에 없으면 `failed-operation-timeout`, Enter 뒤 10분 안에 파일이 없으면 `failed-generation-timeout`이다(FR-010). 완전 자동 흐름은 앱 실행 직후 곧바로 폴링한다.
