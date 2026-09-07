# Quickstart: 모델 준비 완료 연출 + 캐릭터 작명

이 기능이 실제로 동작하는지 확인하는 절차다. **기기 없는 검증**과 **실기기
검증**으로 나뉜다. 헌법 원칙 V — "건너뛴 실기기 테스트는 통과가 아니다".

---

## 0. 선행 조건

**★ 헌법 개정이 먼저다** (FR-001). 코드 작업 전에 확인:

```bash
git log --oneline .specify/memory/constitution.md | head -3
```

원칙 III 「씨앗과 페르소나」 개정 커밋이 이 브랜치에 있어야 한다. 없으면
Governance("예외를 코드에 몰래 두지 않는다") 위반이다.

```bash
git branch --show-current    # 035-model-ready-welcome-naming 이어야 한다
```

---

## 1. 기기 없는 검증

### 1-1. 개발 중 (약 7초)

```bash
npm run test:logic
```

순수 모듈 넷(`character-name`·`naming`·`liveness`·`decision`)과 저장·계약
테스트가 여기 있다. 화면을 안 건드렸으면 이것으로 충분하다.

### 1-2. 화면을 건드렸으면

```bash
npm run test:ui
```

`welcome-screen.test.tsx`, `author-picker.test.tsx`(기존 회귀).

**주의**: RNTL 14의 `fireEvent`는 Promise를 반환한다 — `await fireEvent.press(...)`
없이는 상태 갱신이 flush되지 않는다(025에서 실측).

### 1-3. 커밋 전 전체

```bash
npm test           # 두 프로젝트 전부 (약 13초)
npm run lint       # eslint + tsc + 헌법 검사 + prettier
```

**`tsc`가 잡는 것을 `npm test`는 못 잡는다** — jest는 타입을 지운다. 이 기능은
`prewarm()` 시그니처 변경, `DiaryEntry` 필드 추가, `PipelineInput` 확장이 있어
`tsc`가 누락된 호출처를 정확히 가리킨다(014에서 `DiaryListItem` 이중 정의를
잡은 것과 같은 경로).

### 1-4. 위반 주입 — 초록불을 믿기 전에

각 계약의 「위반 주입」 표를 실제로 실행한다. 예:

```bash
# 호칭 줄을 fixedHead()에서 빼 본다 → 018 P11이 잡아야 한다
# (quiet·narrative·imaginative 셋의 접두사가 같아진다)
npm run test:logic -- prompt

# naming.ts에 import { CHARACTERS } 를 넣어 본다 → N6가 잡아야 한다
npm run test:logic -- naming

# LivenessOutcome에 "slow" 갈래를 더해 본다 → L1이 잡아야 한다
npm run test:logic -- liveness
```

**잡히지 않으면 그 테스트는 아무것도 검증하지 않는 것이다.**

---

## 2. 실기기 검증 (SM-S901N / Galaxy S22, debug)

**새 네이티브 모듈이 0개이므로 debug 1회로 충분하다**(012 기준). release 재확인
불필요.

### 2-1. 준비

```bash
# Metro는 gradle 빌드가 끝난 뒤에 띄운다 (동시에 띄우면 exit code 7)
npx expo run:android
EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client

adb reverse tcp:8081 tcp:8081        # USB·무선 관계없이 필요. 재부팅하면 사라진다
adb shell dumpsys trust | grep deviceLocked    # 0이어야 한다 (PIN은 사람이 넣는다)
```

**모델이 필요하다.** 024 T037·027처럼 개발 기계에서 받아 `run-as`로 배치하거나,
온보딩 에셋 다운로드를 실제로 완주시킨다(US1 검증에는 후자가 맞다 — 다운로드
완료 → 연출 전이가 검증 대상이다).

### 2-2. US1 — 첫 실행 연출 (SC-001·SC-002·SC-007)

```bash
adb shell pm clear com.anonymous.alpharium   # 패키지명은 app.json 확인
```

앱 실행 → 온보딩 권한 4단계 → **에셋 다운로드 단계 완주**.

**관찰할 것**:

| 확인 | 통과 조건 |
|---|---|
| 게이트 (FR-002) | 다운로드 완료 후 홈이 아니라 **환영 흐름**이 먼저 뜬다 |
| 대기 문구 (FR-004) | "준비하고 있어요" 류 고정 문구만. 응답 텍스트·초·토큰 수 **0건** |
| 확인이 실제로 돈다 (FR-003) | `adb logcat`에 추론 호출 1회 — 프롬프트가 짧다(일기 프롬프트 아님) |
| 환영 화면 (FR-005) | 사람이 쓴 고정 환영 문구. 추론 생성 텍스트 섞임 **0건** |
| 모델 미노출 (FR-027) | 화면에 모델 식별자·파라미터·양자화·크기 **0건** |
| 재실행 (FR-008) | 앱을 죽였다 다시 켜면 환영이 **다시 안 뜬다** |

**로그로 확인**:

```bash
adb logcat -c && adb logcat | grep -i "llama\|loadPrompt\|completion"
```

확인용 프롬프트가 **일기 프롬프트보다 훨씬 짧아야 한다**(L6 — 화자 규칙 8줄이
없다). 길면 `LIVENESS_INPUT`에 일기 프롬프트 요소가 섞인 것이다.

### 2-3. US2 — 첫 만남 작명 (SC-003)

환영 화면에서 이름 "복실이" 입력 → 확정 → 홈.

| 확인 | 통과 조건 |
|---|---|
| 빈 입력 (FR-012) | 비우거나 공백만 넣으면 확정 안 됨 |
| 글자 수 (FR-013) | 13자째부터 입력이 막힘 |
| 건너뛰기 (FR-014) | 건너뛰면 "금동이"로 홈에 도달 |
| 영속 (FR-015) | 앱 재실행 후에도 "복실이" |
| 네 곳 반영 (SC-003) | 일기 목록 · 설정 "일기 작성자" · 진단 탭 · **생성 일기 프롬프트** |

**프롬프트 반영 확인** — 개발자 탭의 "입력 프롬프트 미리보기"(022)를 본다:

```
너는 '복실이'이라 불린다.     ← 기본값 "금동이"가 아니어야 한다
```

또는 `adb logcat`에서 실제 생성 시 프롬프트를 읽는다.

### 2-4. US3 — 설정에서 이름 변경 (SC-004·SC-005a)

설정 탭 "일기 작성자" → 준비된 캐릭터 이름 편집.

| 확인 | 통과 조건 |
|---|---|
| 즉시 반영 (FR-022) | 저장 직후 그 화면이 갱신 |
| 미준비 (FR-023) | 안 받은 캐릭터는 편집 진입점 없음, "아직 준비되지 않음" 유지 |
| 비우기 (FR-025) | 이름을 지우면 기본 이름으로 되돌아감 (빈 이름 표시 **0건**) |
| **과거 일기 (SC-005a)** | 이름 바꾸기 **전에** 생성한 일기는 **옛 이름 그대로**, 바꾼 **후** 생성한 일기는 새 이름 |
| 옛 일기 폴백 (FR-026b) | 이 기능 이전 일기(스냅샷 없음)는 현재 이름으로 표시, 빈 이름 **0건** |

**SC-005a 재현 절차**:
1. 이름 "금동이" 상태에서 일기 A 생성
2. 설정에서 "복실이"로 변경
3. 일기 B 생성 (다른 날짜)
4. 목록에서 A는 "금동이", B는 "복실이"로 보여야 한다

저장 파일 직접 확인(debug만 가능, release는 `run-as` 불가):

```bash
adb shell run-as com.anonymous.alpharium cat files/diary/2026-09-06.json | grep authorName
```

### 2-5. 확인 실패 갈래 (FR-006·FR-007)

모델을 손상시켜 재현한다:

```bash
adb shell run-as com.anonymous.alpharium sh -c 'dd if=/dev/urandom of=files/models/a1.bin bs=1024 count=10 conv=notrunc'
adb shell pm clear com.anonymous.alpharium   # onboarding.json만 지우려면 파일 단위로
```

| 확인 | 통과 조건 |
|---|---|
| 환영 미표시 (FR-006) | 환영 화면이 안 뜨고 "아직 준비 중" 안내 |
| 플레이스홀더 없음 (FR-006) | 가짜 일기·가짜 응답이 만들어지지 **않는다** |
| 오류 사유 미노출 (W16) | 화면에 파일 경로·모델 오류 메시지 **0건** |
| 탈출구 (FR-007) | [다시 시도]와 [건너뛰기]가 둘 다 있고 동작 |

**재현이 어려우면 계약 테스트로 갈음한다**(spec 명시) — `judgeLiveness()`의
`failed` 갈래 넷이 기기 없이 검증된다.

### 2-6. Maestro

```bash
npm run test:device
```

**★ 새 흐름은 `scripts/run-device-tests.mjs`의 `FLOWS`에 등록해야 돈다.**
등록 안 하면 파일이 있어도 안 돌고, 초록불인데 아무것도 검증되지 않는다.

신규: `.maestro/welcome-naming.yml`

**실행 순서 주의**: `unified-permission-onboarding.yml`(021)이
`Launch app ... with clear state`(= `pm clear`)로 앱 데이터를 전부 날린다 —
**모델·일기·설정이 삭제된다.** 024 §7이 이것에 당했다.

> 이번 세션의 순서: `welcome-naming.yml`(모델 필요) → 기존 회귀 흐름 →
> `unified-permission-onboarding.yml`(맨 마지막).

**회귀로 함께 돌릴 것**: `diary-character-select.yml`(023에서 페르소나 이름을
문안으로 쓰도록 고쳐졌다 — 이름이 사용자 지정으로 바뀌면 깨질 수 있다),
`author-picker` 관련 흐름, `prompt-preview.yml`(022 — 호칭 줄이 바뀐다).

---

## 3. 완료 판정

- [ ] 헌법 원칙 III 개정 커밋이 코드 커밋보다 앞에 있다 (FR-001)
- [ ] `npm test` 전부 통과, `npm run lint` 클린 (eslint 0 error, tsc, 헌법 검사
      위반 0, prettier)
- [ ] 각 계약의 위반 주입이 **실제로 잡히는 것**을 확인했다
- [ ] 실기기에서 US1·US2·US3 각각 최소 1회 관측 (SC-007)
- [ ] Maestro 신규 흐름이 `FLOWS`에 등록되고 PASS
- [ ] 회귀 흐름(캐릭터 선택·프롬프트 미리보기·온보딩) PASS
- [ ] 미확인으로 남은 것을 `spec.md` 또는 `findings`에 적었다 (원칙 V)

---

## 4. 알려진 함정 (AGENTS.md에서)

- **Metro 캐시가 스테일하면** "Loading from localhost:8081..."에 영구히 머문다.
  오류 없이 영영 로딩 중이라 원인을 안 가리킨다 → `npx expo start --clear`
- **`adb shell`의 줄 끝은 CRLF다** — 파일명 정규식 검사가 빗나간다
- **한글 검증 문구는 `-Dfile.encoding=UTF-8`이 필요하다**(한국어 Windows는
  CP949). `run-device-tests.mjs`가 이미 넣는다
- **Maestro 기본 텍스트 매칭은 노드 전체와 맞춘다** — 부분 문자열은 정규식으로
- **`<Text>`에 여러 조각이 있으면 `testID`가 접근성 트리에 안 나온다**(025
  실측) → `accessibilityLabel`을 함께 준다. 작명 입력창·환영 문구에서 재발 위험
