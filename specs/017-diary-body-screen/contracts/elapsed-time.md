# Contract: 소요 시간 사후 기록

FR-011~018, 헌법 1.2.0의 계약이다.

## 측정 불변식

**T1. 측정 지점은 정확히 둘, `on-device.ts`의 `generate()` 안에만 있다.**
- `visionMs`: `readPhotos()` 호출 직전부터 반환 직후까지(사진을 실제로 읽은
  경우만 — `request.vision === "none"`이거나 그날 사진이 없어 `readPhotos()`
  자체를 부르지 않으면 측정하지 않는다, FR-013).
- `writingMs`: `runWithTimeout()` 호출 직전부터 반환 직후까지(모델 로드
  시간은 포함하지 않는다 — AGENTS.md가 이미 "생성 시간 한도는 모델 적재 시간을
  재지 않고 `engine.run()` 구간만 잰다"고 확립한 경계와 같은 경계를 재사용한다).

**T2. 네이티브 지표를 쓰지 않는다.** `run.run`에서 오는 것은 여전히
`{ text, ending }` 둘뿐이다(`llama-port.ts` 경계 불변). `writingMs`는 `on-device.ts`
가 `Date.now()` 두 번의 차이로 직접 만든 값이지, `llama.rn`의 `timings` 필드를
옮긴 것이 아니다.

**T3. 실패 경로에는 시간이 남지 않는다.** `judge()`가 거부하거나, 타임아웃·끊김
등으로 실패가 확정되면 `GenerationFailure`를 반환하고 그 값에는 `timing`이 없다
(data-model.md §5). 측정 자체는 실패 직전까지 진행됐더라도(예: 글쓰기 도중
타임아웃) 그 값을 실패 결과에 담지 않는다 — 완료되지 않은 일의 소요 시간은
"겪은 사실"이 아니다.

**T4. 사진을 0장 분석했으면 `visionMs`가 없다.** `readPhotos()`를 아예 부르지
않은 경우(vision `none` 또는 그날 사진 0장) `timing.visionMs`가 `undefined`다
— 0으로 채우지 않는다(원칙 V, "모르는 것을 기본값으로 채우지 않는다"의 연장:
여기서는 "안 한 일"이며 "0초 걸린 일"이 아니다).

## 문장 조립 불변식 (화면 쪽, `DiaryDetailScreen.tsx`)

**T5. 문장은 화면이 조립한다, 저장 시점에 문자열로 굳히지 않는다.**
`DiaryEntry.timing`은 숫자(밀리초)만 담고, "N분 SS초" 같은 문자열이나 완성된
문장은 저장하지 않는다 — 캐릭터 이름 표시 방식이 바뀌어도(페르소나 개정 등)
과거 저장된 일기가 낡은 문구를 담고 있지 않게 한다.

**T6. 문장 틀은 다음 형태를 벗어나지 않는다**:
```
{이름}{topicParticleFor(이름)} 이렇게 일기를 작성했어요.
[사진을 {N}장을 분석하는 데 {M분 SS초}가 걸렸어요.]
일기를 작성하는 데 {M분 SS초}가 걸렸어요.
```
대괄호 문장은 `timing.visionMs`가 있을 때만 나타난다(T4). `N`은
`entry.photos?.length ?? 0`이 아니라 **`timing.visionMs`가 있을 때만 유의미한
장수**이므로 `entry.photos?.length`(캡션 성공한 사진 수, User Story 1과 공유하는
값)를 그대로 쓴다 — 새 카운팅을 만들지 않는다.

**T6a. 첫 줄은 "이 일기가 본 것" 절의 고정 타이틀을 대체한다(2026-08-24 확정).**
`timing`이 있으면 절 제목 자리 자체가 `{이름}{topicParticleFor(이름)} 이렇게
일기를 작성했어요.`가 되고, 원래 고정 문구("이 일기가 본 것")는 사라진다 —
같은 문장이 타이틀과 본문 두 곳에 중복으로 남지 않는다. `timing`이 없으면(옛
일기) 절 제목은 그대로 "이 일기가 본 것"이다(회귀 없음).

**T7. 이름은 `personaOf(entry.character).name`에서만 얻는다.** `entry.character`
(문자열 리터럴)를 화면에 그대로 노출하지 않는다 — 007·016이 이미 세운 경계
(화면은 `persona.ts`를 거쳐서만 이름을 안다)를 그대로 따른다.

**T8. 비교·평균·모델 식별자를 문장에 넣지 않는다(헌법 1.2.0 MUST NOT).** 문장
틀 자체에 그런 자리가 없다 — `timing`이 숫자 2개뿐인 타입이므로 "지난번보다"
같은 표현을 넣으려면 다른 일기의 `timing`을 함께 읽어야 하는데,
`DiaryDetailScreen`은 `entry` 하나만 props로 받는다(다른 일기에 접근할 방법이
없다 — 타입이 곧 방어).

**T9. 진행 중 화면(`writing` 상태)에는 이 문장이 등장할 자리가 없다.**
`AppScreen`의 `writing` 갈래는 `timing`을 담지 않는다(`app/state.ts` 변경
없음, data-model.md 「상태 전이 없음」) — `written`/`detail` 갈래만
`entry.timing`을 가질 수 있다.

## 시간 서식

**T10. `formatDuration(ms: number): string`이 "M분 SS초" 또는(1분 미만)
"SS초"를 만든다.** 반올림은 초 단위로 내림(`Math.floor(ms / 1000)`) — 사후
서술이 "약 2분 10초 걸렸다"는 감각과 맞으면 충분하고, 밀리초 단위 정밀도는
"측정 장치" 인상을 준다(원칙 IV의 정신 — 소수점까지 보이면 성능 지표처럼
읽힌다).

## 테스트로 확인해야 하는 것

- `on-device.test.ts`: `visionMs`가 `readPhotos()`를 부른 경우에만 있는지,
  `writingMs`가 항상 있는지(성공 경로), 실패 경로에서 `timing` 필드 자체가
  없는지.
- `DiaryDetailScreen.test.tsx`: `timing` 없음(옛 일기)/`visionMs` 없음(사진
  0장)/둘 다 있음 세 경우의 렌더링, 로스터 5인 + 받침 있는 합성 이름에서
  은/는이 맞는지(particle.test.ts와 중복 확인), 진행 중 화면 스냅샷에 시간
  관련 텍스트가 전혀 없는지.
- 위반 주입: `formatDuration`에 밀리초를 그대로 이어붙이거나, 두 일기의
  `timing`을 비교하는 코드를 임시로 넣어 리뷰/헌법 검사가 잡아내는지 확인
  (개발 방식 관례, AGENTS.md).
