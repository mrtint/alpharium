# Research: 128

## R1 원인 가름 (실측, 2026-11-24, SM-S901N dev)
- Decision: 원인은 (a) 묘사가 지어낸다. 일기 모델은 옮길 뿐.
- 근거: 실제 사진(카메라 영수증 9·스크린샷 2, 같은 장 1회 중복 → 12건) 12/12가 「**Question:** … **Answer:** …」 꼴로 금액·날짜를 지어냄. 일기 본문이 그대로 옮김. 보통 사진 4장은 묘사 2·JSON 라벨 2, 문답 꼴 0. 캡션은 저장되지 않고 진단에도 없어 임시 로그로 읽음(커밋 안 함).
- Alternatives: (b)를 가정한 프롬프트 수정 — 기각(관측과 다름, 방안 4 소유자 기각).

## R2 방안 1의 값
- Decision: `Query.exeForMetadata()`의 `filename`·`width`·`height`를 쓴다. iOS `mediaSubtypes`는 쓰지 않는다.
- 근거: `AssetMetadata` 타입에 세 값이 있고 「파일 경로를 풀거나 파일을 열지 않고」 얻는다(새 네이티브·장당 호출 없음). `mediaSubtypes`는 새 API에서 장마다 `getMediaSubtypes()` 비동기 호출. iPhone 스크린샷은 19.5:9로 비율 기준에 걸린다. 안드로이드는 width·height가 `null`일 수 있다(타입 주석) → 판정 안 함.
- 표본: `Screenshot_…` 1440×3120(2.17), `file_…` 590×1280(2.17), 카메라 4:3·16:9(≤1.78).
- [미확인] iOS에서 `filename`·크기 실제 값 — quickstart에서 본다.

## R3 방안 2의 기준
- Decision: 꾸밈 기호를 벗긴 묘사가 `question:`으로 시작(대소문자 무시) 또는 낱말 `receipt`·`invoice`·`document`·`transaction` 포함(낱말 경계).
- 근거: 표본 12/12가 문답 꼴. 보통 사진 묘사에 `table` 등장 → 제외. 낱말은 문답 꼴이 아닌 문서 묘사 대비 보조. 사람이 정한 값이며 측정이 아니다.
- Alternatives: 넓은 낱말(text·paper·table·screen) — 오탐 위험으로 기각.

## R4 전부 걸러진 날·엔진
- Decision: 묘사 0·거른 장 ≥1 → `seen`(실패 아님) → 하루 종류 `unread` + 고정 줄. 전부 화면 캡처인 날도 엔진은 열린다(선별 뒤 `captionAll` 앞에서 미리 판정해 엔진을 안 여는 길은 판정 자리를 둘로 만든다).
- 근거: FR-001 한 곳. 엔진 적재 비용은 받아들임(드문 날).

## R5 고정 줄의 자리
- Decision: `sentenceSignalLines`의 사진 문장 바로 뒤(신호 줄 — 되뱉기 대상 아님). 로스터는 `quiet` 하나(문장형 경로)라 `visionLimitLines`(영어·중국어 경로)는 바꾸지 않는다.
- 근거: FR-010, 원칙 III — 로스터 밖 경로를 위해 문구를 늘리지 않는다.
