# Quickstart — 검증 가이드

**Feature**: 033-character-screen-press-feedback | **Date**: 2026-09-07

이 문서는 **이 기능이 실제로 됐는지 확인하는 절차**다. 구현 코드는 담지 않는다
(그것은 `tasks.md`와 구현 단계의 몫).

**★ 이 스펙의 핵심 위험**: 기기 없는 테스트가 전부 초록이어도 눌림 반응이 실기기에서
**조용히 안 돌 수 있다**(research R1·R2). Q3(실기기)이 유일한 최종 확인이다.

---

## Q0 — 사전 준비

```
git branch --show-current      # 033-character-screen-press-feedback 여야 한다
npm test                       # 이관 전 기준선. 전부 GREEN인지 먼저 본다
```

**⚠️ `babel.config.js`를 고친 뒤에는 Metro 캐시를 반드시 비운다**:

```
npx expo start --clear
```

안 비우면 "Loading from localhost:8081..."에 **오류 없이 영영 머문다**
(AGENTS.md — 원인을 가리키지 않는 실패다).

---

## Q1 — 기기 없는 검증 (약 1분)

```
npm run test:ui                # 화면·컴포넌트 (.tsx)
npm test                       # 두 프로젝트 전부
npm run lint                   # eslint + tsc + 헌법 검사 + prettier
```

**통과 기준**:

| 항목 | 기대 |
|---|---|
| `__tests__/ui/character-list.test.tsx` | **무수정** GREEN (SC-002) |
| `__tests__/ui/list-row.test.tsx` | **무수정** GREEN (SC-002) |
| `__tests__/ui/button.test.tsx` | **무수정** GREEN |
| 신규 계약 테스트 (CS·PF) | GREEN |
| `__tests__/jest-projects.test.ts` | 파일 수 가드 GREEN |
| 헌법 검사 | 위반 **0** |
| `tsc` | 오류 0 |

**원시 hex 0 확인** (SC-001):

```
grep -nE '#[0-9a-fA-F]{6}' src/ui/CharacterListScreen.tsx
```

→ **아무것도 안 나와야 한다.**

**`PRESS` 참조가 둘뿐인지 확인** (SC-008):

```
grep -rln 'PRESS' src/ | grep -v tokens.ts
```

→ `src/ui/components/Button.tsx`, `src/ui/components/ListRow.tsx` **둘만** 나온다.

**새 컴포넌트 0개 확인** (PF2):

```
ls src/ui/components/ | wc -l
```

→ **7** 이어야 한다.

---

## Q2 — 위반 주입 (방어가 실제로 잡는지)

새 규칙을 세울 때마다 실제로 어겨 보고 잡히는지 확인한다(007~032 공통 관례).
**각 주입 뒤 반드시 되돌린다.**

| # | 주입 | 잡아야 하는 것 |
|---|---|---|
| 1 | `CharacterListScreen.tsx`에 `import { assetFor } from "./models/assets"` 추가 | `npm run lint` 헌법 검사 (`UI_TOUCHES_MODEL`/`UI_TOUCHES_ASSET`) — CS6 |
| 2 | `CharacterListScreen.tsx`의 `쓸 수 있음`을 `준비 완료`로 변경 | 기존 `character-list.test.tsx` + CS1 계약 테스트 |
| 3 | `Button.tsx`에서 `onPressOut` 제거 | PF3 계약 테스트 |
| 4 | `Button.tsx`에서 `disabled`일 때도 반응하게 변경 | PF6 계약 테스트 |
| 5 | 화면 파일에서 `PRESS`를 직접 import | PF1 (참조 파일 수 초과) |
| 6 | `ListRow.label` 타입을 `string`으로 되돌림 | `tsc` (화면이 노드를 넘김) |

**잡히지 않는 주입이 있으면 그 계약이 실효 없는 것**이므로 테스트를 먼저 고친다.

---

## Q3 — ★ 실기기 검증 (필수 — 이것 없이는 통과가 아니다)

**기기**: SM-S901N (Galaxy S22, One UI 7 / Android 16), dev debug.

**원칙 V**: 건너뛴 실기기 테스트는 통과가 아니다. 기기 없이 전부 초록이어도
온디바이스는 검증되지 않은 상태다.

### Q3-0 준비

```
EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client --clear
adb reverse tcp:8081 tcp:8081
adb shell dumpsys trust | grep deviceLocked     # deviceLocked=0 이어야 한다
```

`babel.config.js`를 고쳤으므로 **`--clear` 필수**. 잠금 해제는 사람이 한다.

### Q3-1 화면 이관 육안 (US1)

**가는 길**: 설정 탭 → 아래로 스크롤 → `VisionPicker`·`GeocodingSettingToggle`
**아래**에 캐릭터 목록이 있다(029 SS4 — "캐릭터" 탭은 없다).

| 확인 | 기대 |
|---|---|
| 배경·글자·구분선 | 설정 탭 나머지와 같은 아이보리 톤. 이 부분만 이질적이지 않다 (SC-003) |
| 다섯 캐릭터 | 이름(금동이·루이·오드·샤오바이·모카) + 소개 + 상태가 전부 보인다 |
| 상태 문장 | `쓸 수 있음` / `받아야 함` 등 — **문안이 이관 전과 같다** (CS1) |
| 동작 버튼 | `준비하기`/`지우기`. 지우기만 위험색, 나머지는 보조색 |
| 사진 모델 줄 | `사진을 보는 데 필요한 것`이 캐릭터 **아래에** 별도로 |
| 모델 정보 | 크기·파일명·`gguf`·`Q4`·파라미터 수가 **하나도 없다** (CS8) |
| 추천 표시 | **없다** — 다섯이 같은 자격 (CS8) |

### Q3-2 눌림 반응 육안 (US2) — ★ 이 스펙의 핵심

| 확인 | 기대 |
|---|---|
| 버튼을 **누르고 있는다** | 살짝 작아진다 (`scale 0.97`) |
| 손을 뗀다 | 원래 크기로 부드럽게 돌아온다 (`120ms`) |
| 누른 채 밖으로 끌고 나가 뗀다 | 원래대로 돌아오고 **아무 일도 안 일어난다** (PF5) |
| 주변 요소 | 눌러도 **밀려나거나 출렁이지 않는다** (PF4) |
| 비활성 버튼 | 눌러도 **반응 없음** (PF6) |
| 탭 결과 | 준비/지우기/멈추기가 이관 전과 **똑같이** 동작 |

**⚠️ 반응이 전혀 없으면 `babel.config.js`의 worklets 플러그인을 의심한다**
(research R1). 이 실패는 오류를 안 내고 조용하다 — 애니메이션만 안 돈다.

### Q3-3 원칙 IV 확인 (SC-006)

일기 탭 → `일기 쓰기` → **생성 중 화면**을 본다.

| 확인 | 기대 |
|---|---|
| 진행률 숫자 | **없다** |
| 경과 시간 | **없다** |
| 생성 중인 글 | **없다** (005 FR-028b) |
| 있는 것 | 회전 표시 + `그만두기`뿐 |

눌림 반응을 더했다고 이 화면이 드러내는 정보가 **하나도 늘지 않아야** 한다.

### Q3-4 Maestro 회귀 — 흐름 셋 (SC-004)

**⚠️ 대상은 `diary-character-select.yml`이 아니다**(research R7). 그 흐름은
`AuthorPicker`용이라 이 화면을 안 지난다.

```
npm run test:device
```

또는 개별 실행:

```
maestro test .maestro/download-conflict.yml
maestro test .maestro/parallel-model-download.yml
maestro test .maestro/photo-vision.yml
```

**전부 갱신 없이 PASS해야 한다.**

깨지면 **흐름이 아니라 구현을 고친다**(032 공통 원칙). 가장 유력한 원인은
**행 높이 변화로 스크롤 도달이 어긋난 것**(CS10) — `ListRow`에 넘기는 `style`로
세로 여백을 현행(12)에 맞춘다. `ListRow`의 기본값은 안 고친다.

한글 검증 문구 때문에 `-Dfile.encoding=UTF-8`이 필요하나
`run-device-tests.mjs`가 이미 넣는다.

---

## Q4 — 자동화하지 않는 것 (사람이 판단한다)

**자동화되지 않았다고 통과한 것이 아니다**(원칙 V).

| 항목 | 왜 |
|---|---|
| 눌림 반응이 **실제로 부드러운가** | jest는 reanimated를 목으로 대체한다(R2). 육안뿐 |
| worklet이 UI 스레드에서 도는가 | 재는 순간 측정 장치다(원칙 IV). 육안뿐 |
| 세기·시간 값이 적절한가 | 사람이 정한 상수(R4). 어색하면 `tokens.ts` 한 줄 수정 |
| release/R8에서 안 깨지는가 | **범위 밖**(FR-023) — 032 이월 잔여와 함께 |
| One UI 8.5 인상 | **범위 밖**(FR-023) |

---

## Q5 — 완료 판정

전부 충족해야 "됐다"고 말한다:

- [ ] Q1 전부 GREEN, 원시 hex 0, `PRESS` 참조 2파일, 컴포넌트 7개
- [ ] Q2 위반 주입 6종이 **전부 잡힌다**
- [ ] Q3-1 화면 이관 육안 통과
- [ ] Q3-2 **눌림 반응이 실기기에서 실제로 보인다** ← 이 스펙의 존재 이유
- [ ] Q3-3 생성 중 화면 미노출 유지
- [ ] Q3-4 Maestro 흐름 셋 **갱신 없이** PASS
- [ ] 032 `tasks.md` T059 잔여 (2)에 "눌림 반응 확인" 추가 기록 (FR-023)
- [ ] `main` 직접 커밋 없음 — 브랜치 → PR
