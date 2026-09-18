# Quickstart: Modernist 스플래시·권한 요청 흐름 검증

## 전제 조건

- Android 실기기(dev/debug), USB 또는 무선 디버깅 연결, 잠금 해제 상태.
- `adb reverse tcp:8081 tcp:8081` 실행됨.
- Metro가 `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`로 떠 있음.

## 기기 없는 검증 (항상 먼저)

```bash
npm run test:logic   # tokens.ts 값 계약 (DT1~DT7), requirements.ts platforms
npm run test:ui      # LogoScreen/OnboardingScreen 화면 렌더 계약
npm run lint          # eslint + tsc + 헌법 검사 + prettier
npm test              # 전체 (커밋 전)
```

**기대 결과**: `theme-tokens.test.ts`의 DT4(WCAG AA 대비) 6개 케이스
전부 통과 — 특히 `accentForeground vs accent`, `textMuted vs bg`가 값
조정 후 통과하는지 확인한다(research.md R2).

## 실기기 검증 시나리오

### D1 — 스플래시 화면 레이아웃 (SC-001)

1. 앱 데이터를 지운다(`adb shell pm clear <package>` 또는 새 설치).
2. 앱을 실행한다.
3. **관찰**: 오프화이트 배경(#f3f2f2) 위 좌측 정렬로 72×72 레드 사각
   로고 마크 + "Alpharium" 굵은 타이틀이 상단에, 하단에 "휴대폰
   안에서만" 문구와 점 3개(강조/중간/비활성)가 구분선 아래 좌우로
   보인다.
4. **관찰**: 5초 이내에 사용자 조작 없이 다음 화면(첫 권한 다이얼로그)
   으로 자동 전환된다.

### D2 — 사진·위치·알림 세 단계 연속 자동 호출 (SC-003)

1. D1 이후 화면을 관찰한다.
2. **관찰**: Modernist 배경(스플래시와 동일) 위에 앱 자체 설명 카드나
   버튼 없이 곧바로 사진 권한 OS 다이얼로그가 뜬다.
3. 다이얼로그에서 허용 또는 거부를 선택한다.
4. **관찰**: 다이얼로그가 닫히자마자 위치 권한 다이얼로그가 자동으로
   뜬다(앱 자체 "다음" 버튼 없음).
5. 위치·알림도 동일하게 반복한다.
6. **관찰**: 세 단계 모두 앱이 멈추거나 죽지 않는다.

### D3 — 배터리 최적화 예외 단계 (FR-007c)

1. D2의 세 단계를 마친 직후 화면을 관찰한다.
2. **관찰**: 기존 021 방식 그대로 — 안내 문구("기기가 절전에 들어가도…")
   와 [설정 열기]/[건너뛰기] 버튼이 Modernist 토큰(오프화이트 배경, 진한
   레드 강조)으로 표시된다.
3. [설정 열기]를 눌러 OS 설정으로 이동했다가 돌아온다.
4. **관찰**: 앱이 멈추지 않고 다음 단계(범위 밖 — 작명 화면)로 이어진다.

### D4 — "다시 묻지 않음" 갈래 (FR-008a)

1. 사진 권한을 "다시 묻지 않음"과 함께 거부한다(가능한 기기에서).
2. 앱을 재시작하거나 온보딩을 다시 띄운다(설정 → "권한 안내 다시 보기").
3. **관찰**: 사진 단계에서 OS 다이얼로그가 다시 뜨지 않고, 앱 설정
   화면으로 이동을 안내하는 문구가 Modernist 토큰으로 표시된다.

### D5 — 게이트 무변경 확인 (FR-010)

1. 위 온보딩을 완료한 뒤 앱을 재시작한다.
2. **관찰**: 스플래시·권한 화면이 다시 뜨지 않고 곧바로 다음 화면(작명
   또는 홈)으로 진입한다.

## Maestro 회귀

```bash
npm run test:device   # .maestro/unified-permission-onboarding.yml 등
```

**기대 결과**: 021이 등록한 기존 흐름이 새 시각 스타일에서도 PASS —
`testID`(`onboarding-screen`, `onboarding-step-*`, `onboarding-allow`,
`onboarding-skip`, `onboarding-open-settings`)가 유지되므로 흐름 자체는
깨지지 않아야 한다. 단, 설명 카드가 사라진 세 단계는 흐름의 대기 조건이
"설명 카드 렌더"가 아니라 "OS 다이얼로그 등장"으로 바뀌므로, 흐름 스크립트
자체를 조정해야 할 수 있다(tasks.md에서 확인).

## WCAG 실측 재현 (research.md R2 검증)

```bash
node -e '
function relLum(hex){const c=hex.replace("#","");const ch=[0,2,4].map(i=>{const s=parseInt(c.slice(i,i+2),16)/255;return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4)});return 0.2126*ch[0]+0.7152*ch[1]+0.0722*ch[2]}
function ratio(a,b){const la=relLum(a),lb=relLum(b);return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05)}
console.log("text/bg", ratio("#201e1d","#f3f2f2").toFixed(2));
console.log("textMuted/bg", ratio("#6b6767","#f3f2f2").toFixed(2));
console.log("accentForeground/accent(as danger)", ratio("#f3f2f2","#ae1800").toFixed(2));
'
```
