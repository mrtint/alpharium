# Data Model: 일기 본문 사진 슬라이드 및 갤러리 뷰

**Feature**: 025-diary-photo-gallery | **Date**: 2026-08-31

이 기능은 **새 저장 데이터를 만들지 않는다**(FR-016, SC-006). 아래는 (a) 소비하는
기존 구조와 (b) 화면 로컬 임시 상태다.

---

## 1. 소비하는 기존 구조 — `DiaryEntry.photos` (017, 변경 없음)

**출처**: `src/diary/types.ts:114`

```ts
photos?: { photoId: string; takenAt: Date; resizedPath: string }[];
```

| 필드 | 타입 | 이 기능에서의 쓰임 |
| --- | --- | --- |
| `photoId` | `string` | 슬라이더·갤러리 페이저의 React `key`. Maestro `testID` 접미사(`diary-photo-<photoId>` 등)로도 쓴다 |
| `takenAt` | `Date` | **화면에 표시하지 않는다.** 배열 순서(023 `select.ts`가 정한 시간순)를 그대로 따르며 이 값으로 재정렬하지 않는다 |
| `resizedPath` | `string` | `<Image source={{ uri: 'file://' + resizedPath }}>`. 013이 만들고 017이 보존한 로컬 리사이즈 사본 |

**불변식(017에서 이어받아 이 기능이 지킨다)**:

- `photos`가 `undefined` → 옛 일기(017 이전). 슬라이더·갤러리 영역 자체가 없다
  (FR-007). 화면은 오류 없이 열린다.
- `photos`가 `[]`(길이 0)는 **발생하지 않는 것으로 다룬다** — 017은 사진이
  0장이면 `photos` 필드를 아예 두지 않는다. 그래도 방어적으로 길이 0도
  `undefined`와 같게 처리한다(슬라이더 미렌더).
- `photos.length >= 1` → 슬라이더 렌더. `signalsUsed.photos.kind`가 `none`/
  `unknown`이면 이 배열이 없으므로(017 파이프라인) 자동으로 텍스트 표시만 남는다
  (FR-006).
- `resizedPath`의 파일을 못 읽음 → 그 항목만 "이 사진은 이제 없다"로 대체
  (FR-005·FR-014). 배열에서 제거하지 않는다 — 인덱스·`"N / M"` 총계는 그대로.

**이 기능이 이 구조에 하지 않는 것**: 필드 추가·타입 변경·정렬 변경·필터링.
`DiaryEntry` 저장 형식은 배포 전후로 동일하다(SC-006).

---

## 2. 화면 로컬 임시 상태 — `GalleryState`

**저장하지 않는다.** `DiaryDetailScreen`의 `useState`로만 존재하며 파일·
`AsyncStorage`·`DiaryEntry` 어디에도 남기지 않는다(009의 "고른 하루를 파일에
남기지 않는다"와 같은 성격 — 시간이 지나면 무의미해지는 UI 상태).

```ts
type GalleryState =
  | { open: false }
  | { open: true; index: number };  // index: entry.photos[] 내 0-기반 위치
```

| 상태 | 의미 | 전이 |
| --- | --- | --- |
| `{ open: false }` | 갤러리 닫힘 (초기값). 슬라이더만 보임 | 슬라이더의 사진 `i`를 탭 → `{ open: true, index: i }` |
| `{ open: true, index }` | 풀스크린 갤러리 열림, `index`번째 사진 표시 | 갤러리에서 좌우 스와이프 → `index` 갱신 (0 ≤ index ≤ photos.length-1, 끝에서 멈춤); 닫기 버튼/안드로이드 뒤로 가기 → `{ open: false }` |

**생명주기**:

- 회전·앱 백그라운드 전환·OS 화면 복귀 → **유지**. 같은 Activity 안에서 React
  state가 살아남으므로 별도 코드 없이 성립(Clarifications Q5, FR-015a).
- 앱 완전 종료 후 콜드 스타트 → state 없음. 앱은 일기 목록에서 시작하며 이
  일기 상세로 다시 들어오면 `{ open: false }`로 초기화된다. **이것은 정상**
  (스펙 명시) — 복원 로직을 두지 않는다.
- `DiaryDetailScreen` 언마운트(목록으로 뒤로 가기) → state 소멸. 다시 열면
  `{ open: false }`.

**불변식**:

- `open: true`일 때 `index`는 항상 `entry.photos`의 유효 범위 안이다. 슬라이더가
  없으면(`photos` 없음/길이 0) 갤러리를 열 수 없다 — `open: true`는 `photos`가
  1장 이상일 때만 가능.
- `index`는 갤러리 페이저의 `onMomentumScrollEnd`에서 `contentOffset.x /
  layoutWidth`를 반올림해 재계산한 값으로 갱신한다(스와이프가 페이지를 건너뛰어도
  표시가 정확).

---

## 3. 관계 요약

```text
DiaryEntry (저장됨, 017)
  └─ photos?: PhotoRef[]         ← 읽기 전용 소비
                                   (PhotoSlider, PhotoGalleryModal이 같은 배열을 받음)

DiaryDetailScreen (화면)
  ├─ useState<GalleryState>       ← 저장 안 함, 회전/백그라운드에서 유지
  ├─ <PhotoSlider photos onOpen={i => setGallery({open:true, index:i})} />
  └─ <PhotoGalleryModal
        photos
        visible={gallery.open}
        initialIndex={gallery.open ? gallery.index : 0}
        onClose={() => setGallery({open:false})} />
```

슬라이더와 갤러리가 **같은 `entry.photos` 배열**을 받는 것이 FR-003·FR-010·
SC-003("두 집합이 완전히 동일")의 구조적 보장이다 — 서로 다른 소스에서 사진을
가져올 여지가 없다.
