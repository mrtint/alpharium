# Quickstart: 사진이 있는 하루는 VLM을 반드시 거친다

**Phase 1** | 2026-09-14 | [plan.md](./plan.md) · [contracts/photo-vision-always.md](./contracts/photo-vision-always.md)

기능이 됐는지 확인하는 순서다. 기기 없는 검증이 먼저이고, 실기기는 dev(debug)
1회다(R10).

---

## 0. 전제

```
git branch --show-current      # 042-photo-vision-always 여야 한다
```

**`main`이면 멈춘다**(AGENTS.md — 2026-08-29에 022를 main에서 작업한 사고).
`setup-plan.ps1`의 `BRANCH`는 스펙 디렉터리 이름이지 체크아웃된 브랜치가 아니다.

**헌법이 먼저 고쳐졌는가**:

```
grep -n "Version.*1.7.0" .specify/memory/constitution.md
grep -c "자세히 봄\|사진을 보지 않음" .specify/memory/constitution.md   # 개정 기록 외 0
```

---

## 1. 기기 없는 검증

```
npm run lint        # eslint + tsc + 헌법 검사 + prettier
npm test            # 두 프로젝트 전부
```

**기대**:

- **`tsc` 0 오류** ★ — 이것이 축소 완료의 조건이다(R1). 좁힌 타입이 남긴 자리를
  전부 정리했다는 뜻
- 헌법 검사 위반 0
- `__tests__/jest-projects.test.ts` 통과 — **손댈 필요가 없다.** 이 가드는
  하드코딩된 수가 아니라 `__tests__/`를 직접 훑어 `testMatch`와 맞춰 보므로
  스위트 파일이 줄면 줄어든 채로 맞는다(E8)

---

## 2. 위반 주입 — 방어가 실제로 잡는가

각각 고친 뒤 **되돌린다.** 잡히지 않으면 그 계약은 없는 것이다.

| # | 주입 | 잡아야 할 것 |
|---|---|---|
| V1 | `VisionSetting`에 `"none"` 되살리기 | C1 (**`tsc`는 못 잡는다** — 유니온을 넓히는 것은 타입 오류가 아니다) |
| V2 | `IMAGE_TOKENS`에 `detailed: 1024` 더하기 | `tsc` 잉여 속성 |
| V3 | `task.ts`에 `vision = "none"` 분기 되살리기 | C3 |
| V4 | 018 두 `useEffect` 조건을 같게 만들기 | C5 세 케이스 |
| V5 | 화면에 `photoSignalPresent` prop 더하기 | C6 |
| V6 | `VisionOutcome`에 `skipped` 되살리기 | C8 |
| V7 | 옛 설정 파일 정리 코드 넣기 | C7 |

**V1과 V4가 이 기능의 핵심이다** — 나머지는 `tsc`가 거드는 자리지만 이 둘은
타입이 침묵한다.

---

## 3. 실기기 — dev(debug) 1회

### 3.0 기기 상태 (★ 건드리지 말 것)

SM-S901N / dev debug / 모델 `a1`·`v1`·`v2` 배치됨 / `run-as` 가능.

> **자동 생성 ON(목표 12시)·배터리 예외·작성자 금동이는 계속 쓰는 설정이다.
> 끄지 않는다.**
>
> **`pm clear`를 쓰는 Maestro 흐름을 이 세션에서 돌리지 않는다**
> (`unified-permission-onboarding.yml`) — 024 2차 세션이 그것으로 검증용 모델을
> 날렸고 다음 세션이 재다운로드로 시작했다.

```
adb shell dumpsys trust | grep deviceLocked      # 0 이어야 한다
adb reverse tcp:8081 tcp:8081
EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client
```

### D1 — 설정 탭에 「사진 보기」가 없다 (FR-005·SC-004)

설정 탭을 **끝까지** 훑는다.

**기대**: 「사진 보기」 섹션 자체가 없다. 「자동」·「사진을 보지 않음」·「빠르게 봄」·
「자세히 봄」 **넷 다 안 보인다.** 「일기 작성자」와 「장소명」은 그대로 있다.

**함께 본다**: 사진 보는 모델의 **준비 상태**(내려받기 관리)는 그대로 있고,
거기에 모델 이름·파일 크기가 없다(FR-008, 원칙 III).

### D2 — 사진 있는 하루가 캡션을 돈다 (FR-001·SC-001) ★ 핵심

사진이 있는 하루를 골라 「일기 쓰기」.

```
adb logcat -c && adb logcat | grep -iE "has_media|loadPrompt|mtmd"
```

**기대**:
- `has_media=1` — VLM이 사진을 IMAGE 청크로 디코드했다
- 생성 화면에 「사진들을 훑어보는 중…」이 뜬다
- 저장된 일기에 **사진 분석 소요 시간**이 있고 본문이 사진 내용을 반영한다

**설정을 아무것도 안 건드렸다는 것이 이 검증의 요점이다** — 예전에는 「빠르게 봄」을
골라야 했다.

### D3 — 사진 0장인 하루는 엔진을 안 연다 (FR-002·SC-002)

사진이 없는 하루를 골라 「일기 쓰기」.

**기대**:
- `has_media` 로그가 **없다**, VLM 로드 로그가 없다
- 일기에 사진 분석 소요 시간이 **없다**
- 본문이 「사진: 없었다」 쪽으로 정직하다 — 사진 내용을 단정하지 않는다

### D4 — 「없다」와 「모른다」가 다르다 (FR-003·SC-005)

D3의 일기와, 사진 권한을 거부한 상태의 일기를 견준다.

```
adb shell pm revoke com.anonymous.alpharium android.permission.READ_MEDIA_IMAGES
```

**기대**: 「사진 없음」과 「사진 모름」이 **서로 다른 문구**로 나온다.

> ⚠️ `pm revoke`는 앱 프로세스를 즉시 kill한다(024 실측). 회수 **상태에서** 새로
> 여는 것이지 "실행 중 회수"를 재현하는 것이 아니다.
> **검증 후 권한을 되돌린다**(`pm grant`).

### D5 — 백그라운드 자동 생성도 사진을 본다 (FR-004·SC-001) ★ 이 기능의 실질

**이것이 가장 중요한 실기기 항목이다** — 지금은 자동 생성이 사진을 한 장도 안
본다(R7).

사진이 있는 하루를 남겨 두고 개발자 탭의 「지금 자동 생성 트리거」, 또는:

```
adb shell cmd jobscheduler run -f com.anonymous.alpharium <JOB_ID>
```

**기대**: `has_media=1`. 화면에서 쓴 것과 **같게** 사진을 본다.

### D6 — 개발자 탭 「지금 생성」도 사진을 본다 (FR-004a)

개발자 탭의 생성 버튼으로 사진 있는 하루를 쓴다.

**기대**: `has_media=1`. **지금은 이 버튼이 사진을 한 장도 안 본다**(R8) — 고쳐졌는지
보는 자리다.

### D7 — 옛 일기가 정상적으로 열린다 (FR-013·SC-006)

목록에서 이전 버전에 쓴 일기 몇 개를 연다.

**기대**: 전부 정상. 사진 슬라이더·갤러리(025)도 그대로.

---

## 4. Maestro

```
node scripts/run-device-tests.mjs
```

- `.maestro/photo-vision.yml` — **재작성한 것**이 PASS(「설정이 없다」 + 준비 상태 유지)
- `.maestro/generate-diary.yml` · `.maestro/diary-photo-gallery.yml` 회귀 PASS

> **`unified-permission-onboarding.yml`은 이 세션에서 제외한다**(위 3.0 — `pm clear`).

---

## 5. 남기는 기록

`specs/042-photo-vision-always/`에 실측을 적는다. **재지 않은 것은 재지 않았다고
적는다**(원칙 V):

- D2·D5·D6의 `has_media` 관측과 소요 시간
- **256과 1024의 출력 차이는 이 기능에서 재지 않았다** — 다이얼을 치웠을 뿐이다
