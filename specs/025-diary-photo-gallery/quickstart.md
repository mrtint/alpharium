# Quickstart: 일기 본문 사진 슬라이드 및 갤러리 뷰

**Feature**: 025-diary-photo-gallery | **Date**: 2026-08-31

이 기능이 끝에서 끝까지 동작함을 증명하는 실행 시나리오. 상세 규칙은
[contracts/photo-gallery.md](./contracts/photo-gallery.md)와
[data-model.md](./data-model.md) 참조.

---

## 1. 기기 없는 검증 (항상 돈다)

### 실행

```bash
npm run test:ui      # 화면 테스트 (jest-expo)
npm run lint         # eslint + tsc + 헌법 검사 + prettier
```

`test:logic`은 이 기능에 해당 없음(순수 UI, 새 순수 함수 없음).

### 기대 결과

- **새 스위트** `__tests__/ui/photo-gallery.test.tsx`(또는
  `diary-detail.test.tsx`의 017 describe 확장) 전부 통과:
  - `PhotoSlider`: 1장 폭 페이징(C1), `"N / M"` 표시·갱신(C3), 탭 → `onOpen(i)`
    (C4), 사본 실패 → "이제 없다" + 나머지 정상(C5), 1장짜리(C6).
  - `PhotoGalleryModal`: `visible` → Modal 표시(C10), `initialIndex`에서 시작
    (C11), 좌우 스와이프 → 인덱스 갱신(C12), 끝에서 멈춤(C13), `"N / M"` 갱신
    (C14), 닫기 버튼·`onRequestClose` → `onClose`(C15), 배경 탭에 `onClose`
    없음(C16), 사본 실패 풀스크린(C17), 1장짜리(C18).
  - `DiaryDetailScreen`: 격자 → 슬라이더 교체(C19), 옛 일기 미렌더(C20·C27),
    갤러리 `useState` 배선(C21·C22), 생성 중 화면에 슬라이더/갤러리 `testID`
    없음(C24).
- **017 회귀 테스트 유지**: `diary-detail.test.tsx`의 "017 — 사진 표시" describe
  3개 케이스가 슬라이더 문맥에서도 통과(C26·C27·C28).
- `npm run lint` 클린 — `tsc`가 `GalleryState` 유니온 처리 누락을 잡고,
  `check:constitution` 위반 0(새 규칙 없음, 기존 규칙에 안 걸림), prettier 클린.

### 위반 주입 (방어 확인 — AGENTS.md 관례)

1. `PhotoSlider`가 캡션을 렌더하도록 고침 → C8 테스트 실패해야 함.
2. `PhotoGalleryModal`이 `initialIndex`를 무시하고 항상 0에서 시작 → C11 실패.
3. 갤러리에서 마지막 다음으로 순환하도록 인덱스 클램프 제거 → C13 실패.
4. `DiaryDetailScreen`이 `screen.kind === "writing"` 경로에서도 슬라이더를
   렌더하도록 함 → C24 실패.
5. `PhotoGalleryModal` 상태를 `AsyncStorage`/파일에 저장 → SC-006 계약
   테스트(저장 형식 불변) 실패.

각각 실제로 어겨 보고 테스트가 잡는지 확인한다.

---

## 2. 실기기 검증 (debug 1회 — 새 네이티브 모듈 없음, 012 기준)

### 사전 조건

- SM-S901N(또는 동급) USB/무선 디버깅 연결, 잠금 해제, 화면 켜짐
  (`adb shell dumpsys trust`의 `deviceLocked=0`).
- Metro dev 환경: `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`
  (AGENTS.md 「도구 사용법」).
- `adb reverse tcp:8081 tcp:8081`.
- 사진이 2장 이상 있는 하루의 일기가 저장돼 있어야 한다. 없으면
  `npm run seed:day -- many-camera <날짜>`로 심고(010), 「빠르게 봄」으로
  일기를 생성한다. **검증용 합성 하루는 "경로가 도는가"만 본다 — 품질 결론에
  쓰지 않는다**(010 원칙).

### 실행

```bash
npm run test:device      # Maestro — .maestro/diary-photo-gallery.yml 포함
```

또는 수동으로 앱에서: 일기 목록 → 사진 있는 일기 열기 → 아래 확인.

### 기대 결과 (수동 관찰 항목)

| 확인 | 통과 조건 |
| --- | --- |
| 슬라이더 렌더(SC-001) | 사진이 96px 격자가 아니라 화면 폭 한 장씩 보인다. 아래에 `"1 / N"` |
| 가로 스와이프 | 왼쪽으로 쓸면 다음 사진으로 한 장씩 스냅, 표시가 `"2 / N"`으로 갱신 |
| 탭 → 풀스크린(SC-002) | 두 번째 사진을 탭하면 갤러리가 뜨고 **그 사진**(두 번째)이 먼저 보임, `"2 / N"` |
| 갤러리 스와이프 | 좌우로 넘기면 사진 바뀌고 표시 갱신. 마지막에서 더 넘겨도 멈춤(순환 없음) |
| 집합 일치(SC-003) | 갤러리에서 넘길 수 있는 장수 == 슬라이더 `"/ N"`의 N == 그 일기가 본 사진 수 |
| 닫기 + 위치 복원 | 닫기 버튼(그리고 안드로이드 뒤로 가기)으로 갤러리 닫힘 → 상세 화면의 이전 스크롤 위치 유지 |
| 회전/백그라운드(FR-015a) | 갤러리 연 채 기기 회전 또는 홈 버튼 후 복귀 → 갤러리가 같은 사진에서 그대로 |
| 옛 일기 회귀(SC-004) | 017 이전 저장 일기(사진 필드 없음)를 열면 슬라이더 영역 없이 정상 |
| 0장 일기 회귀(SC-004) | 사진 0장 하루의 일기 → "사진: 없었다" 텍스트만, 슬라이더 없음 |
| 생성 중 미노출(SC-005) | 일기 생성 진행 중 화면에 슬라이더·갤러리·`"N / M"` 없음 |

### 미확인으로 남길 수 있는 것

- 핀치 줌·아래로 쓸어 닫기: **범위 밖**(스펙 명시). 후속 과제.
- iOS: 이 저장소는 안드로이드 실기기만 검증한다(AGENTS.md).
- release 재확인: 새 네이티브 모듈이 없으므로 생략(012, AGENTS.md 「테스트」).

---

## 3. 완료 판정

- [ ] `npm run test:ui` 통과 (신규 스위트 + 017 회귀)
- [ ] `npm run lint` 클린
- [ ] 위반 주입 5종 전부 테스트가 잡음
- [ ] `.maestro/diary-photo-gallery.yml`가 `run-device-tests.mjs` `FLOWS`에 등록됨
- [ ] 실기기 debug에서 위 관찰 항목 표 전부 통과
- [ ] AGENTS.md 025 절에 실측 결과 기록 (커밋 전)
