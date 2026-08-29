# Quickstart: 개발자 탭 내 입력 프롬프트 모니터링

이 기능이 실제로 도는지 확인하는 실행 시나리오. 상세 계약은 [contracts/prompt-preview.md](./contracts/prompt-preview.md),
타입은 [data-model.md](./data-model.md).

## 사전 조건

- `npm install` 완료.
- 기기 없는 테스트: 별도 준비 없음.
- 실기기 검증: dev 빌드가 설치된 Android 기기 + Metro(`EXPO_PUBLIC_APP_ENV=dev npx expo start
  --dev-client`), `adb reverse tcp:8081 tcp:8081`, 기기 잠금 해제. (AGENTS.md "도구 사용법" 참조.)
- 새 네이티브 모듈 없음 → **release 재확인 불필요, debug 실기기 1회로 충분**(012 기준).

## 기기 없는 검증 (항상 돈다)

```
npm run test:logic        # prompt-preview.test.ts, diagnostics-report.test.ts (순수 로직)
npm run test:ui           # diagnostics-screen.test.tsx
npm run lint              # eslint + tsc + 헌법 검사 + prettier
npm test                  # 커밋 전 전체
```

### 기대 결과

| 항목 | 통과 기준 |
|---|---|
| `prompt-preview.test.ts` | PP1(문자열 동일)·PP3(프리셋 상수)·PP5(추론 미호출)·PP6(approxChars)·PP8(실패 갈래) 초록 |
| `diagnostics-report.test.ts` | PP4(5캐릭터 × 전 프리셋 키)·리포트에 `promptPreviews` 실림 |
| `diagnostics-screen.test.tsx` | 화면이 프리셋별 프롬프트 텍스트·근사 크기 라벨을 렌더. `report` mock의 문자열만 사용 |
| `constitution-rules.test.ts` | PP7 위반 주입: `src/ui/`에 `from "../diary/prompt"` 넣은 가짜 소스가 위반으로 잡힌다. `signals/expo-port`는 안 잡힌다 |
| `npm run lint` (tsc) | `DiagnosticReport.promptPreviews` 필드가 모든 생성 자리에서 채워짐(안 채우면 tsc 에러) |
| 기존 계약 테스트 | `acceptance.test.ts` 갈래 수(4), `llama-port` `timings` 폐기 테스트, 진단 화면 노출 게이트(001 SC-013) **무수정 통과** (PP9·PP10) |

## 위반 주입 체크리스트 (AGENTS.md 작업 습관)

각 규칙을 실제로 어겨 보고 방어가 잡는지 확인한다:

1. **PP1** — `buildPreview()`가 `promptPrefix(character)`만 반환하도록 고친다 →
   `prompt-preview.test.ts` PP1 실패.
2. **PP2/PP5** — `prompt-preview.ts`에 `import { llamaEngine } from "../inference/llama-port"`
   추가 → 소스 검사 실패(PP5).
3. **PP3** — `SIGNAL_PRESETS`를 `const … = CHARACTERS.map(...)`류로 바꾼다 → PP3 실패.
4. **PP6** — `approxChars`를 `approxTokens`로 개명 → 소스 검사(토큰 어휘) 실패.
5. **PP7** — `DiagnosticsScreen.tsx`에 `import { buildPrompt } from "../diary/prompt"` 추가 →
   `npm run lint`(헌법 검사) 실패. 별도로 `import { expoPhotoPort } from "../signals/expo-port"`는
   **여전히 통과**해야 한다.
6. **PP9** — `acceptance.ts`에 5번째 갈래를 추가 → 기존 `acceptance.test.ts` 실패(이 기능이
   그 파일을 건드리지 않았음을 역으로 확인).

## 실기기 검증 (debug 1회)

1. dev 빌드 실행, "개발자" 탭으로 이동(local·dev에서만 보인다).
2. **D1 — 프롬프트 원본 표시**: 프롬프트 미리보기 섹션에서 캐릭터를 하나씩 넘기며 각
   캐릭터의 "신호 없음" 프롬프트가 전체(잘림 없이) 보이는지 확인. 캐릭터 이름 줄
   (`너는 '금동이'이라 불린다.` 등)이 캐릭터마다 다른지, 중국어·영어 캐릭터는 마지막
   `중국어로 써라.`/`영어로 써라.` 줄이 다른지 본다.
3. **D2 — 신호 조합 비교**: 같은 캐릭터에서 "신호 없음" ↔ "사진 있음"을 전환. "사진 있음"
   쪽에만 `사진: 2장 (…시, …시)` 및 `위 사진이 그날의 전부가…` 류 문장이 있는지 확인
   (SC-002).
4. **D3 — 근사 크기**: 각 조합 옆에 문자 수(또는 근사 크기)가 보이고, "사진 있음" 쪽이
   더 큰지 확인. 라벨에 "근사치" 또는 "토큰 아님" 취지의 문구가 있는지 본다(FR-011).
5. **D4 — 스크롤/복사**: 긴 프롬프트가 스크롤되고 텍스트를 길게 눌러 선택·복사할 수 있는지
   (FR-010).
6. **D5 — 사용자 화면 무노출**: 일기 목록·상세·쓰기·설정·온보딩을 훑어 프롬프트나 크기
   숫자가 어디에도 없음을 확인(SC-005).
7. **D6 — prod 게이트**(선택, 시간 되면): prod 빌드에 "개발자" 탭이 없어 미리보기에 닿을
   경로가 없음(SC-004). 새 네이티브 없어 R8 재확인은 생략(012 기준).

## Maestro

기존 진단/개발자 탭 Maestro 흐름에 프롬프트 섹션 확인 스텝(캐릭터 `testID` + 프리셋 라벨
정규식)을 추가하고, **`scripts/run-device-tests.mjs`의 `FLOWS`에 등록되어 있는지 확인**한다
(등록 안 하면 초록불인데 아무것도 검증 안 됨 — AGENTS.md 경고).
