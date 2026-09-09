# Quickstart: 로스터를 검증된 하나로 축소

**Phase 1** | 2026-09-09 | [plan.md](./plan.md) · [contracts/roster-entry.md](./contracts/roster-entry.md)

이 기능이 됐는지 확인하는 순서다. 기기 없는 검증이 먼저이고, 실기기는
dev(debug) 1회다.

---

## 0. 전제

```
git branch --show-current      # 037-narrative-model-measurement 여야 한다
```

**`main`이면 멈춘다**(AGENTS.md — 2026-08-29에 022를 main에서 작업한 사고).
`setup-plan.ps1`이 출력하는 `BRANCH`는 스펙 디렉터리 이름이지 브랜치가 아니다.

---

## 1. 헌법이 먼저 고쳐졌는가

```
git log --oneline -- .specify/memory/constitution.md | head -3
grep -c "narrative\|imaginative\|qwen3\|gemma3" .specify/memory/constitution.md
grep -n "Version.*1.6.0" .specify/memory/constitution.md
```

**기대**:
- 헌법 커밋이 코드 커밋보다 **먼저** 있다
- 로스터 절에 빠진 넷의 조항이 없다(개정 기록의 언급은 있어도 된다)
- 버전이 1.6.0
- 원칙 III에 진입 기준 조항이 있다

---

## 2. 기기 없는 검증

```
npm run lint        # eslint + tsc + 헌법 검사 + prettier
npm test            # 두 프로젝트 전부
```

**기대**: 전부 클린. 특히 —

- **`tsc` 0 오류** — 이것이 FR-005·006의 완료 조건이다(R1). 좁힌 타입이
  남긴 자리를 전부 정리했다는 뜻
- **헌법 검사 위반 0**
- 테스트 스위트 수가 줄지 않았다(`jest-projects.test.ts`가 파일 수를 센다)

---

## 3. 위반 주입 — 방어가 실제로 잡는가

각각 고친 뒤 되돌린다.

| # | 주입 | 잡혀야 하는 곳 |
|---|---|---|
| V1 | `CHARACTERS`에 검증 안 된 캐릭터를 되살린다 | `tsc`(레코드 키 불일치) + 계약 테스트 C1 |
| V2 | `personaOf()`가 모르는 캐릭터에 기본값을 돌려주게 한다 | 계약 테스트 C3 |
| V3 | 이름 되짚기에서 로스터 밖 방어를 뺀다 | 계약 테스트 C4(`authorName` 없는 케이스) |
| V4 | `resolveSelection`이 캐릭터 하나면 자동으로 고르게 한다 | 007 계약 테스트 / C5 |

**하나라도 안 잡히면 그 방어는 없는 것이다**(007~014 관례).

---

## 4. 실기기 — dev(debug) 1회

### 4.1 준비

```
EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client --clear
adb reverse tcp:8081 tcp:8081
adb shell dumpsys trust | grep deviceLocked    # 0 이어야 한다
```

기기 잠금은 사람이 푼다. Metro 캐시가 스테일이면 옛 번들이 뜨므로
`--clear`를 뺀 채로 이상하면 다시 띄운다(AGENTS.md).

### 4.2 D1 — 캐릭터가 하나만 보인다 (SC-001)

설정 탭 → **일기 작성자**

**기대**: 금동이 한 줄 + 소개 + [이름 바꾸기]. 루이·오드·샤오바이·모카가
어디에도 없다. 하단 **캐릭터**(다운로드 관리) 섹션도 한 줄.

### 4.3 D2 — 일기가 써진다 (SC-003·SC-007)

일기 탭 → 사진 없는 날 → 일기 쓰기(이미 있으면 덮어쓰기 확인)

**기대**: 저장 성공. `writingMs`가 036 관측 범위(19~22초)에서 크게 벗어나지
않는다. 3회 연속 저장된다.

```
adb shell run-as com.anonymous.alpharium cat files/diary/<날짜>.json
```

### 4.4 D3 — 옛 일기가 읽힌다 ★ (SC-002)

**이 세션이 만든 오드 일기가 검증 재료다** — 037 측정으로
`2026-09-08.json`에 `character: "imaginative"`, `authorName: "오드"`가 저장됐다.

`authorName` 없는 케이스도 만들어 본다:

```
# 백업 후 authorName 필드만 지운 사본을 심는다
adb shell run-as com.anonymous.alpharium cat files/diary/2026-09-08.json > backup.json
```

**기대**:
1. 목록에 그 일기가 보인다
2. 상세가 열리고 본문·신호가 전부 보인다
3. `authorName` 있으면 "오드"가 보인다
4. **`authorName` 없어도 화면이 멈추지 않는다** ← 현재 코드가 깨지는 자리
5. `"imaginative"` 같은 내부 식별자가 화면에 없다

### 4.5 D4 — 이름 바꾸기가 산다 (SC-004)

설정 → [이름 바꾸기] → 다른 이름 → 저장 → 일기 쓰기

**기대**: 새 이름이 화면과 저장된 일기(`authorName`)에 나타난다.

⚠️ Maestro가 이 자리의 `Pressable` 좌표를 잘못 볼 수 있다(035 실측) —
`adb shell uiautomator dump`로 좌표를 얻어 raw `adb input tap`으로 갈음한다.

### 4.6 D5 — 마지막으로 쓴 캐릭터가 로스터 밖일 때

```
adb shell run-as com.anonymous.alpharium cat files/preferences/selected-character.json
```

037 측정 뒤라 `{"character":"imaginative"}`가 들어 있을 수 있다.

**기대**: 앱이 정상 실행되고, 일기를 쓰면 금동이가 쓴다(R2 — 코드 변경 없이
성립해야 한다).

---

## 5. Maestro 회귀

```
JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8 node scripts/run-device-tests.mjs
```

**갱신 필요**: `diary-character-select.yml`(다섯 캐릭터 전제).

**⚠️ 알려진 것**:
- `download-conflict.yml`은 026 이후 구조적으로 PASS 불가 — 회귀 실패로
  오해하지 않는다
- `unified-permission-onboarding.yml`은 `pm clear`로 앱 데이터를 전부
  날린다 — **모델·일기가 사라지므로 맨 마지막에** 돌린다(D3의 검증
  재료가 사라진다)

---

## 6. 완료 판정

- [ ] 헌법 1.6.0이 코드보다 먼저 커밋됐다
- [ ] `npm run lint`·`npm test` 클린, `tsc` 0 오류
- [ ] 위반 주입 V1~V4가 전부 잡힌다
- [ ] 실기기 D1~D5 확인
- [ ] Maestro 회귀(알려진 실패 제외)
- [ ] `docs/roadmap/README.md` 14번을 완료로 갱신
