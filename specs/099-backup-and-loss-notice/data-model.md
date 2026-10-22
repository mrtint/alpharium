# Data Model: 099

저장 데이터의 모양·경로는 바뀌지 않는다. 이 기능이 정하는 것은 각 자리의 **백업 정책**이다.

| 자리 (`Paths.document` 아래) | 내용 | 백업 정책 | 근거 |
|---|---|---|---|
| `models/` | 모델 파일, 구간·부분 파일, `state.json` | **제외** (iOS 속성, 안드로이드 규칙) | FR-001 |
| `diary/` | 일기 본문 | OS 기본 (건드리지 않음) | FR-005 |
| `vision-cache/` | 일기에 저장된 사진 사본 (일기의 일부) | OS 기본 | FR-004, 013 FR-007 |
| `preferences/` | 설정·상태 파일 | OS 기본 | FR-005 |

## 상태

- **제외 표시(iOS)**: `models` 디렉터리의 `isExcludedFromBackup`. 거짓 → 참(멱등). 디렉터리가 지워졌다 다시 만들어지면 다시 거짓에서 시작하므로 `openDirectory()`가 매 프로세스 한 번 다시 건다.
- **규칙(안드로이드)**: 빌드 시점 정적 산출물. 런타임 상태 없음.

## 검증 규칙

- 안드로이드 규칙 두 파일의 `<exclude>`는 `domain="file" path="models/"` 하나뿐이고 `<include>`·다른 경로가 없다.
- iOS 제외 대상 경로는 `models` 하나뿐이며 `preferences`·`vision-cache`·일기 디렉터리를 인자로 부르는 호출이 소스에 없다.
