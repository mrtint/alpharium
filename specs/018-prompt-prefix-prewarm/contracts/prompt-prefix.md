# Contract: 프롬프트 고정 접두사

FR-002, FR-005, 헌법 원칙 II의 계약이다. `prewarm-engine.md`의 E7과
직접 맞물린다 — 이 계약이 깨지면 그 계약의 방어도 함께 무너진다.

## 불변식

**P8. `buildPrompt()`의 결과는 언제나 `promptPrefix(character)`로
시작한다.** 사진 있음/없음, `dayStillOpen` 참/거짓, 장소명 있음/없음 등
어떤 조합의 `DiaryRequest`를 넣어도 예외가 없다. 이것이 이 기능의
안전장치다 — 하나라도 어긋나면 KV 캐시가 빗나가 프리워밍이 조용히
무의미해진다(성능 저하로만 나타나고 오류가 없으므로 가장 늦게
발견된다).

**P9. `fixedHead()`와 `buildPrompt()`가 같은 배열 리터럴에서
나온다.** 접두사를 별도로 하드코딩하지 않는다 — 복제하면 프롬프트를
고칠 때 한쪽만 바뀌고, 그 순간 P8이 조용히 깨진다.

**P10. 고정 접두사에는 날마다 바뀌는 내용이 섞이지 않는다.** 날짜,
"~에 네가 본 것", 사진 관련 문구, 신호 값이 접두사 안에 있으면 안
된다 — 있으면 그 접두사는 애초에 "고정"이 아니고, 캐릭터가 같아도
날마다 프리필이 빗나간다.

**P11. 캐릭터마다 접두사가 서로 다르다.** 이름과 언어가 접두사에
포함되므로 다섯 캐릭터의 접두사가 모두 달라야 한다 — 같으면 캐릭터를
바꿔도 이전 캐릭터의 캐시를 그대로 재사용하게 되어 원칙 III(캐릭터
정보가 새지 않는다는 것과는 별개로, 캐릭터별 이름·언어가 프롬프트에
정확히 실려야 한다는 FR-014a·014b)이 깨진다.

**P12. `promptPrefix()`는 순수 함수다.** `Character`만 받고, 시각·난수·
신호값을 읽지 않는다(기존 `buildPrompt()`의 P6 결정성과 같은 성질).

## 계약 시그니처

```ts
// src/diary/prompt.ts
function fixedHead(character: Character): string[];   // 내부 함수, export 안 함
export function promptPrefix(character: Character): string;
export function buildPrompt(request: DiaryRequest, vision?: PhotoVision): string;
```

`fixedHead()`는 export하지 않는다 — 밖에서 쓸 이유가 없고(항상
`promptPrefix()`를 거친다), export하면 복제 위험이 늘어난다.

## 테스트로 확인해야 하는 것

- `prompt.test.ts`:
  - P8: 모든 캐릭터 × 다양한 `DiaryRequest` 조합에서
    `buildPrompt(...).startsWith(promptPrefix(character))`가 참인지
  - P10: `promptPrefix()`의 결과에 날짜 형식(`\d{4}-\d{2}-\d{2}`),
    "에 네가 본 것", "사진", "다닌 자리" 같은 날마다 바뀌는 문구가
    전혀 없는지
  - P11: 다섯 캐릭터의 `promptPrefix()` 결과가 서로 다른지(집합 크기로
    확인)
  - 기존 프롬프트 테스트(005의 P-1~P-7 등)가 이 리팩터 후에도 그대로
    통과하는지 — **바이트 동일성**이 깨지지 않았다는 확인. 이것이
    통과하지 않으면 옮기는 과정에서 무언가 바뀐 것이다.
- 위반 주입: `fixedHead()`에 날짜를 실수로 넣어보고 P10 테스트가
  잡는지, 두 캐릭터의 이름을 같게 만들어보고 P11 테스트가 잡는지 확인.
