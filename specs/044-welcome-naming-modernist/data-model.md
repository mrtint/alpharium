# Data Model: Modernist 첫 만남 및 캐릭터 작명

이 스펙은 새로운 영속 데이터 타입을 만들지 않는다(spec.md Key Entities).
아래는 화면이 그대로 유지하는 기존 타입을 정리한다 — 모두 무변경.

## 기존 타입 (무변경)

### `WelcomePhase` (`src/ui/WelcomeScreen.tsx`)

```ts
type WelcomePhase = "checking" | "welcome" | "failed";
```

`LivenessOutcome`이 아니다(035 L15) — 조립부(`App.tsx`)가 확인 결과를 이
갈래로 접어 넘긴다. 값이 3개인 것도, 이름도 이번 스펙에서 바뀌지 않는다.

### `WelcomeScreenProps` (`src/ui/WelcomeScreen.tsx`)

```ts
type WelcomeScreenProps = {
  phase: WelcomePhase;
  characterName: string;
  onSubmitName: (name: string) => void;
  onSkip: () => void;
  onRetry: () => void;
};
```

FR-003이 이 시그니처의 무변경을 명시한다. 필드 5개, 타입, 순서 전부 그대로.

### `testID` 상수 (문자열, 코드에 인라인)

```
welcome-screen
welcome-checking
welcome-greeting
welcome-name-input
welcome-name-submit
welcome-name-skip
welcome-failed
welcome-retry
welcome-failed-skip
welcome-character-name
```

research.md R5의 결정에 따라 10개 값 전부 무변경. 별도 타입으로 선언되어
있지 않고 JSX 리터럴에 직접 쓰인다 — 이 목록은 계약 테스트와 Maestro
흐름이 참조하는 값의 전체 목록을 문서화하는 목적이다.

### 화면 로컬 상태 (`useState`, 컴포넌트 내부, 무변경)

```ts
const [draft, setDraft] = useState("");
```

이름 입력 중인 초안 문자열. 파일에 저장되지 않는다(035 W7과 같은 판단).

## 이번 스펙이 다루는 것

이 스펙은 위 타입들의 **값을 렌더하는 방식**(JSX 구조, 스타일)만 바꾼다.
어떤 타입도 필드가 늘거나 줄지 않으므로, 이 문서에 새 엔티티 섹션이
없다 — spec.md의 "Key Entities" 절도 `WelcomePhase` 하나만 언급하고
"값이 늘거나 줄지 않는다"고 명시한 것과 일치한다.
