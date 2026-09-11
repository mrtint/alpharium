# Quickstart: 완성된 일기 첫 표시를 타자기 연출로

**Feature**: 038-typewriter-diary-reveal | **Date**: 2026-09-11

이 문서는 기능이 끝났음을 증명하는 **실행 가능한 검증 시나리오**다. 구현 코드는
`tasks.md`와 구현 단계에서.

---

## 사전 준비

- 브랜치 `038-typewriter-diary-reveal` 체크아웃 (`git branch --show-current`로 확인).
- `npm install` 완료. 새 의존성 없음.
- 실기기(SM-S901N 등) + Metro dev 환경 (`EXPO_PUBLIC_APP_ENV=dev npx expo start
  --dev-client`), `adb reverse tcp:8081 tcp:8081`. AGENTS.md "도구 사용법" 참조.
- 실기기에 기본 캐릭터(quiet) 모델이 준비돼 있어야 생성이 돈다.

---

## 1. 기기 없는 검증 (항상 돈다)

```bash
npm run test:logic     # grapheme-slice.test.ts 포함, ~7초
npm run test:ui        # typewriter-text.test.tsx, diary-reveal.test.tsx
npm run lint           # eslint + tsc + 헌법 검사 + prettier
```

**기대**:
- `grapheme-slice.test.ts` — G1~G7 GREEN. `Array.from`을 `.slice`로 바꾸면
  G2·G5 FAIL(위반 주입 확인).
- `typewriter-text.test.tsx` — C1~C9 GREEN. `skipToEnd` 분기 삭제 시 C4 FAIL,
  `onDone` 가드 삭제 시 C8 FAIL, 언마운트 정리 삭제 시 C6 FAIL.
- `diary-reveal.test.tsx` — C11~C25 GREEN. 기존 `photo-gallery.test.tsx`(025)·
  `diary-body-screen`(017) 스위트 **무수정 GREEN**(SC-004).
- `tsc` 0, 헌법 검사 위반 0, prettier 클린.
- `git diff --stat`에서 `src/diary/`·`src/inference/`·`src/vision/`·
  `src/app/state.ts` **0줄**(SC-006).

---

## 2. 실기기 검증 (debug 1회 — 새 네이티브 모듈 없음, 012 기준)

### 2-1. 첫 표시 타자기 (US1 / SC-001)

1. 홈에서 날짜 = 당일, "일기 쓰기" 탭 → 생성 중 화면(회전 표시)을 기다린다.
2. 생성이 끝나 첫 표시로 넘어가는 순간을 관찰:
   - **기대**: 날짜 캡션은 즉시. 제목이 빈 상태에서 시작해 **글자 단위로** 채워짐.
   - 제목이 다 차면 이어서 본문이 글자 단위로 흐름.
   - 본문이 흐르는 동안 화면 아래에 "이 일기가 본 것" 절·사진 슬라이더가 **없음**.
3. 본문 마지막 글자가 나타난 직후:
   - **기대**: "이 일기가 본 것" 절(사진 수/장소명/소요 시간)과 (사진 있으면)
     사진 슬라이더가 나타남. 그 화면이 그대로 상세 화면(별도 전환 없음).

### 2-2. 탭으로 건너뛰기 (US2 / SC-003)

1. 다시 생성 → 첫 표시에서 제목/본문 타이핑이 도는 동안 화면 아무 곳이나 1회 탭.
   - **기대**: 1초 이내에 제목·본문 전문 + 하단 절 + 슬라이더가 모두 표시.
2. 제목→본문 사이의 짧은 순간에 탭해도 동일하게 즉시 전체(Clarification 경계).
3. 타이핑이 이미 끝난 화면에서 슬라이더의 사진을 탭:
   - **기대**: 갤러리가 열림(025 기존 동작). "화면 탭 = 건너뛰기"가 이 시점엔
     동작하지 않음(FR-006).

### 2-3. 목록 재진입은 즉시 전체 (US3 / SC-004)

1. 첫 표시에서 뒤로 가기 → 일기 목록.
2. 방금 쓴 일기를 목록에서 다시 탭:
   - **기대**: 제목·본문이 **처음부터 전부** 보임. 타이핑 없음. 하단 절·슬라이더
     즉시.
3. 첫 표시에서 타이핑 도중 뒤로 갔다가 목록에서 다시 열기:
   - **기대**: 즉시 전문(중단 지점 이어재생 안 함, FR-008).

### 2-4. 옛 일기 / 0장 회귀 (FR-007 / SC-004)

1. 이전에 쓴 일기(사진 0장 또는 이 기능 전 생성분)를 목록에서 열기:
   - **기대**: 이 기능 도입 전과 동일. 슬라이더 영역 없음, "사진: 없었다" 텍스트,
     타이핑 없음.

### 2-5. 생성 중 화면 무변경 (FR-011 / SC-005)

1. "일기 쓰기" 탭 후 생성 중 화면 관찰:
   - **기대**: 회전 표시 + 독백 한 줄 + "그만두기"만. 진행률 숫자·경과 시간·
     생성 중인 본문 글자 **없음**. 이 기능 전과 동일.
2. "그만두기" 탭 → 홈으로 복귀(첫 실행/일반 무관).

### 2-6. Maestro 회귀

```bash
node scripts/run-device-tests.mjs
```

**기대**: "생성 후 상세" 흐름(`diary-photo-gallery.yml`·`generate-diary.yml` 등)이
시작부 "화면 탭(건너뛰기)" 스텝 추가 후 PASS. 신규 흐름 없음, `FLOWS` 목록 불변.

---

## 완료 판정

- [ ] `test:logic`·`test:ui`·`lint` 모두 GREEN, 위반 주입이 잡힘
- [ ] `git diff --stat`: `diary/`·`inference/`·`vision/`·`app/state.ts` 0줄
- [ ] 실기기 2-1~2-5 육안 확인
- [ ] Maestro 회귀 PASS
- [ ] release 재확인: **불필요**(새 네이티브 모듈 0 — 012, AGENTS.md dev-only 정책)
