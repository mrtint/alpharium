# Contract: 기준 상태

층 1 시작 때(L5·L6) 기기를 이 상태로 만든다. 값의 정본은 `scripts/layer1/baseline.ts`이고 이 표와 같다.

## 설정 파일 (`files/preferences/`)

| 파일 | 동작 | 내용 |
| --- | --- | --- |
| `onboarding.json` | write | `{"completed":true,"batteryNoticeShown":true,"welcomeShown":true,"downloadConsented":true}` |
| `auto-diary.json` | write | `{"enabled":false,"targetHour":22}` |
| `developer-menu.json` | delete | — |
| `simulation.json` | delete | — |
| `auto-write-skipped.json` | delete | — |
| `notified.json` | delete | — |
| `write-failures.json` | delete | — |
| `character-names.json` | delete | — |
| `geocoding-setting.json` | delete | — |
| `selected-character.json` | keep | 로스터 하나 |

**드리프트 가드(G-1)**: 소스의 설정 파일 이름 상수(`src/**`에서 `*.json`을 가리키는 상수) 집합이 이 표의 파일 집합에 포함되지 않으면 테스트가 실패한다. 새 설정 파일을 앱이 읽기 시작하면 이 표에 한 줄을 더해야 한다.

## 일기 (`files/diary/`)

- `YYYY-MM-DD.json`·`YYYY-MM-DD.json.writing` 패턴의 파일만 지운다(058 `removeAll`과 같은 패턴). 그 밖의 파일은 건드리지 않는다.
- 심는다: 오늘·어제·그제 일기 각 1편. 오늘 = 사진 1장, 어제 = 3장, 그제 = 1장. 파일 이름은 그 날짜.
- 사본(`files/vision-cache/`): 이전 사본은 지우고 픽스처 사진 사본 5개(1+3+1)를 둔다.

## 보장

- 모델 파일 존재, 자동 쓰기 꺼짐, 최근 사흘 모두 쓴 날 → 앱을 열어도 일기 생성이 시작되지 않는다(057 판정이 쓸 날이 없다).
- 온보딩 완료 → 첫 실행 게이트를 통과해 홈이 바로 뜬다.
