# Research: 화면 문구를 사실대로

## R1. 접근성 라벨의 자리

- **Decision**: `MaterialGrid`의 `Cell` 값 줄 `View`(`testID={testID}`)에 숫자가 보이는 두 갈래(`count`·`zero`)일 때만 `accessible`과 `accessibilityLabel`을 단다. 라벨은 `장소` 칸에만 필요하므로 `Cell`에 선택 prop `a11yLabel?: (n: number) => string`을 받아 장소 칸만 넘긴다.
- **Rationale**: 소스 주석이 값 줄 testID를 라벨과 값을 섞어 읽지 않으려 일부러 분리했다. 셀 컨테이너에 달면 「장소」 라벨과 값이 한 노드가 된다. 값 줄에 달면 숫자와 단위 두 글자가 하나의 문장으로 읽힌다.
- **Alternatives**: 숫자·단위 `AppText` 각각에 라벨 — 낭독이 둘로 쪼개져 「사진이 찍힌 자리」가 숫자에만 붙는다. 기각.
- **사진 칸**: 이번 범위 밖(로드맵에 장소 칸만 있다).

## R2. 관측된 0

- **Decision**: `zero`(관측된 0과 `none`)에도 「사진이 찍힌 자리 0곳」 라벨을 단다(Clarifications). `unseen`·`loading`·`no-permission`에는 달지 않는다.
- **Rationale**: 화면에 `0곳`이 그려지는 두 갈래만 숫자를 읽어 주면 눈으로 보이는 것과 귀로 듣는 것이 같다.

## R3. FAQ 항목의 자리와 이름

- **Decision**: `data-faq="places"`를 `place-name` 뒤, 목록 맨 끝에 추가한다. `site-pages.test.ts` S9의 기대 배열 끝에 `"places"`를 더한다. 항목 위에 근거 주석(`signals/places.ts` 코드, 짐작 상수 미기재)을 단다.
- **Rationale**: 백업 과제가 같은 파일의 `uninstall` 답을 고치므로 맨 끝 추가만 해 충돌 면적을 줄인다.

## R4. 슬라이드 본문과 045 FR-006

- **Decision**: 확정 본문은 바이트·퍼센트·시간 표현이 없다. 기존 슬라이드 계약 테스트(바이트·퍼센트·숫자 금지)를 그대로 통과한다. 새로 「켜 두면」 조건을 잠그는 단언을 더한다.

## R5. 해라체 문구의 다른 소비자

- **Decision**: `.maestro/writing-monologue.yml:88`의 `notVisible: "쓰고 있다"`를 `"쓰고 있어요"`로 고친다(유일한 실행 줄). 같은 파일·다른 흐름의 주석은 옛 문구를 역사로 인용하므로 두되, `diary-home`·`writing-in-place`·`writing-monologue-rotation`·`settings-entry`의 단언과 `DiaryHomeScreen.tsx` 주석(「…준비해야 한다」)은 새 문구로 맞춘다. 혼잣말 풀에 「쓰고 있어요」가 있어 `notVisible`이 오탐될 수 있는지 `monologue.ts`를 태스크에서 확인한다.

## R6. 골든

- **Decision**: 바뀐 문자열 여덟 개는 `CHANGED_AFTER_GOLDEN`(literal + 해당하는 outputs: `OVERWRITE_CONFIRM`·`WRITING_TEXT`·`SETTINGS_TEXT`), 새 카탈로그 항목 `placesA11y` 하나는 `ADDED_AFTER_GOLDEN`(FAQ는 카탈로그가 아니라 올리지 않는다). 골든 outputs 키가 있는 것은 이 셋뿐이고(확인함), 슬라이드·`needsAuthor`는 literal만 올린다.
