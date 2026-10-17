# Contract: 토큰 정본 `design/tokens.json`

값은 **사람이 정한 상수**다(원칙 V). 이 파일을 고치고 생성기를 돌리는 것이 값을 바꾸는 유일한 길이다.

## 모양

```json
{
  "version": 1,
  "color": {
    "bg": { "light": "#f3f2f2", "dark": "#1a1918", "note": "화면 배경 — 오프화이트 (043 Modernist)" }
  },
  "radius": { "card": { "value": 0, "note": "…" } },
  "type": {
    "title": { "size": 20, "weight": "600", "lineHeight": 28, "note": "화면 제목" },
    "display": { "size": 32, "weight": "700", "lineHeight": 40, "platforms": ["web"], "note": "…" }
  },
  "font": {
    "family": "Pretendard",
    "weights": ["400", "500", "600", "700", "800"],
    "webWeights": ["400", "600", "700"],
    "fallback": ["-apple-system", "BlinkMacSystemFont", "Apple SD Gothic Neo", "Noto Sans KR", "sans-serif"],
    "note": "…"
  },
  "space": { "steps": [4, 8, 10, 12, 16, 20, 24], "note": "앱 사용 빈도 9회 이상 (research R1)" },
  "contrast": [
    { "fg": "text", "bg": "bg", "min": 4.5, "mode": "both", "note": "본문" }
  ]
}
```

## 규칙

- C1. 최상위 키는 `version`·`color`·`radius`·`type`·`font`·`space`·`contrast` 일곱뿐이다. 모르는 키가 있으면 생성기가 실패한다.
- C2. `color`의 키는 정확히 `bg`·`surface`·`border`·`text`·`textMuted`·`accent`·`accentForeground`·`danger`·`dangerForeground`(앱 `COLORS`와 같은 아홉). 각 값은 `light`·`dark` `#rrggbb` 소문자.
- C3. `radius`의 키는 `card`·`pill`·`control`. 값은 0 이상의 정수.
- C4. `type`에서 `platforms`가 없는 항목은 정확히 `title`·`sectionTitle`·`body`·`bodyStrong`·`caption`·`button`(앱 `TYPE`과 같은 여섯). 웹 전용은 `"platforms": ["web"]`. `weight`는 `font.weights` 안의 문자열. 앱 여섯의 값은 이번 변경 전 `tokens.ts`와 같다(G4).
- C5. `font.webWeights ⊆ font.weights`. `family`는 앱 `app.json`의 expo-font 설정과 같은 이름(기존 F4가 잠근다).
- C6. `space.steps`는 양의 정수의 증가 목록.
- C7. `contrast`의 `fg`·`bg`는 `color` 키. `mode`는 `light`·`dark`·`both`. `min`은 3 또는 4.5. `min: 3`은 `note`에 이유(큰 글자·UI·면 위 오프화이트)를 적는다.
- C8. `note`는 비어 있지 않은 문자열이고 생성 영역에서 문서 주석이 된다(`*/`를 포함하지 않는다).
- C9. 계산·파생 금지: 어떤 값도 다른 값에서 식으로 얻지 않는다(원칙 V). 같은 값이 두 곳에 필요하면 두 곳에 적는다.

## 기각

- 참조(`{color.bg}`)·단위 변환·수식 — 생성기가 값을 만들게 되어 원칙 V의 경계를 흐린다.
