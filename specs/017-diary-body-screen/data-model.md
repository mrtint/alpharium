# Data Model: 일기 본문 화면 개선

Phase 1 산출물. research.md의 결정을 실제 타입 변경으로 옮긴다. 기존 필드는 이름·
의미 어느 것도 바꾸지 않는다 — 전부 옵셔널 추가다(하위 호환, spec Assumptions).

## 1. `PhotoCaption` 확장 (`src/vision/types.ts`)

```ts
export type PhotoCaption = {
  photoId: string;
  takenAt: Date;
  text: string;
  /**
   * 캡션에 실제로 쓰인 리사이즈 사본의 경로 (017).
   *
   * **리사이즈가 실행되지 않았거나(resize 미주입) 원본과 같은 경로였으면(013 C1)
   * 없다** — 그때는 지울 것도, 보존할 것도 원본 하나뿐이며 원본은 이 기능의 관리
   * 대상이 아니다(clarify 결정 — 원본이 아니라 사본을 보존한다).
   */
  resizedPath?: string;
};
```

**불변식**: `resizedPath`가 있으면 그 파일은 캡션이 끝난 시점에 **아직 지워지지
않은 상태**다(017 이전에는 `caption.ts`의 `finally`가 즉시 지웠다 —
`contracts/photo-preservation.md` 참조). 최종적으로 지켜지는지 지워지는지는
`pipeline.ts`가 정한다.

## 2. `PhotoVision` — 변경 없음

`captions: PhotoCaption[]`을 그대로 담으므로 위 확장이 자동으로 전파된다. 새 필드를
추가하지 않는다.

## 3. `PhotoPlaces` 확장 (`src/signals/types.ts`)

```ts
export type PhotoPlaces = {
  trace: PlaceTrace;
  source: "photo-exif";
  photosWithLocation: number;
  photosConsidered: number;
  /**
   * 대표 장소의 좌표 (017).
   *
   * **새로 재는 값이 아니다** — `tracePlaces()`가 자리를 묶으며 이미 계산하던
   * 값(첫 자리의 대표 좌표) 중 하나를 반환 범위 밖으로 낸 것뿐이다
   * (research.md §2). 좌표가 하나도 없던 하루(`points.length === 0`)에는 없다.
   */
  representativeCoordinate?: { latitude: number; longitude: number };
};
```

## 4. `tracePlaces()` 반환값 확장 (`src/signals/places.ts`)

```ts
export type PlaceTrace = {
  visitCount: number;
  approximateDistanceMeters: number;
  /** 대표 좌표(첫 자리). 좌표가 없으면 없다 (017, research.md §2) */
  representativeCoordinate?: Coordinate;
};
```

**주의**: `PlaceTrace`(순수 계산 결과)와 `PhotoPlaces`(신호 계층이 담는 값) 둘 다
같은 필드 이름을 갖는다 — `PhotoPlaces.trace`가 `PlaceTrace`를 그대로 안고 있으므로
(`signals/types.ts:92`) `representativeCoordinate`는 사실 `PlaceTrace`에만 추가하면
`PhotoPlaces.trace.representativeCoordinate`로 자동 도달한다. **위 3번 항목의
`PhotoPlaces` 최상위 필드 추가는 취소한다** — `trace` 안에 이미 있으므로 중복이다.
Phase 2(tasks)에서는 `PlaceTrace`만 고친다.

## 5. `DiaryDraft` 확장 (`src/inference/types.ts`)

```ts
/**
 * 생성에 성공했을 때 돌아오는 것.
 *
 * 모델 이름·점수는 여전히 담지 않는다(원칙 III·IV). **소요 시간은 헌법 1.2.0이
 * 연 자리를 담는다** — 완료된 생성 1건의 사실이며, 상위 계층(on-device.ts)이
 * 직접 벽시계로 잰 값만 들어온다. 네이티브 `timings`가 여기 흘러들 수 없다 —
 * `llama-port.ts`가 이미 그 값을 거른다(원칙 IV 경계 유지).
 */
export type DiaryDraft = {
  text: string;
  /**
   * 이번 생성 한 번의 소요 시간 (017, 헌법 1.2.0).
   *
   * 사진을 보지 않은 생성(vision === "none" 또는 그날 사진 0장)에는
   * `visionMs`가 없다 — 모르는 시간을 0으로 채우지 않는다(원칙 V의 확장 적용).
   */
  timing?: { visionMs?: number; writingMs: number };
  /**
   * 이번 생성이 실제로 캡션한 사진들 (017).
   *
   * `PhotoCaption`의 부분집합(`photoId`·`takenAt`·`resizedPath`)만 옮긴다 —
   * 캡션 텍스트(`text`)는 옮기지 않는다. **여기 실린 사본은 아직 삭제되지 않은
   * 상태다** — `pipeline.ts`가 저장 성공을 확인해야 최종적으로 지켜진다.
   */
  usedPhotos?: { photoId: string; takenAt: Date; resizedPath: string }[];
};
```

**불변식**: `GenerationFailure`의 어느 갈래에도 `timing`·`usedPhotos`가 없다(FR-014·
016의 기존 「실패는 text가 없다」와 같은 방어를 확장 필드에도 적용) — 실패
경로에서는 `on-device.ts`가 스스로 `usedPhotos` 사본을 정리하고 값을 버린다
(research.md §1).

## 6. `DiaryEntry` 확장 (`src/diary/types.ts`)

```ts
export type DiaryEntry = {
  date: DayDate;
  text: string;
  title?: string;
  character: Character;
  signalsUsed: DaySignals;
  createdAt: Date;
  /**
   * 이 일기가 실제로 분석한 사진들 (017 FR-001).
   *
   * `signalsUsed.photos`(그날 수집된 사진 전부)와 다르다 — 이것은 VLM이 실제로
   * 캡션한 것만, 최대 5장(VISION_PHOTO_LIMIT)이다. 옛 일기에는 없다.
   */
  photos?: { photoId: string; takenAt: Date; resizedPath: string }[];
  /**
   * 소요 시간 (017, 헌법 1.2.0).
   *
   * **완료된 이 생성 1건의 사실이다.** 다른 일기·다른 실행과 비교하는 필드를
   * 만들지 않는다 — 이 타입에 "평균"·"이전 대비" 같은 필드가 생기는 순간 헌법
   * 1.2.0이 그은 경계(비교·평균·순위 금지)를 어기는 것이다. 옛 일기에는 없다.
   */
  timing?: { visionMs?: number; writingMs: number };
  /**
   * 대표 장소 이름 (017 FR-007, 장소명 설정이 켜진 경우만).
   *
   * `SignalValue`와 같은 성격의 구분을 갖는다 — 좌표 자체가 없으면 이 필드가
   * 아예 없고(그때는 화면이 지금처럼 "다닌 자리: N곳"만 보인다), 좌표는 있는데
   * 이름을 못 얻었으면 `{ kind: "unknown" }`, 얻었으면
   * `{ kind: "known"; value: string }`이다. 설정이 꺼진 채 생성됐으면 이 필드
   * 자체가 없다(지오코딩을 시도하지 않았으므로 unknown도 아니다 — 아예 관측하지
   * 않은 것과 관측했으나 실패한 것은 다른 사실이다).
   */
  placeName?: { kind: "known"; value: string } | { kind: "unknown" };
};
```

**직렬화**: `store.ts`의 `serializeEntry`/`deserializeEntry`는 이미 옵셔널 필드가
JSON 왕복에서 보존됨을 전제로 설계되어 있다(`title?`이 014부터 같은 패턴). `photos`
안의 `takenAt: Date`는 `reviveDates()`가 `signalsUsed.photos`에 하듯 배열을 순회하며
`new Date(...)`로 복원해야 한다 — 빠뜨리면 옛 형식과 달리 이번엔 **조용히 문자열로
남아** 날짜 비교가 깨진다(계약: `contracts/photo-preservation.md`가 이 왕복을
명시).

## 7. 장소명 설정 (`src/app/geocoding-setting-store.ts`, 신규)

`vision-setting-store.ts`와 동일한 모양이다.

```ts
export interface GeocodingSettingPort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}

/** 저장된 적 없으면 null — "고른 적 없음"과 "껐음"은 다른 사실이 아니다.
 *  꺼짐이 기본값이므로(FR-004) null도 꺼짐으로 다룬다(vision-setting과 다른 점 —
 *  vision은 "본 적 없음"과 "안 봄을 골랐음"을 화면이 구분해 보여줄 이유가
 *  있었지만, 장소명은 화면에 별도로 구분해 보여줄 이유가 없다: 꺼짐 화면은
 *  이번 기능 이전과 완전히 같아야 하기 때문이다, FR-005) */
export async function loadGeocodingSetting(port: GeocodingSettingPort): Promise<boolean> {
  // 구현은 vision-setting-store.ts의 loadVisionSetting과 같은 패턴 — 실패 시 false
}

export async function saveGeocodingSetting(
  port: GeocodingSettingPort,
  enabled: boolean,
): Promise<void> { /* ... */ }

export function expoGeocodingSettingPort(): GeocodingSettingPort {
  // preferences/geocoding-setting.json — vision-setting.json과 형제 파일
}
```

## 8. 지오코딩 포트 (`src/signals/geocoding-port.ts`, 신규)

```ts
export type GeocodingResult =
  | { kind: "known"; value: string }
  | { kind: "unknown" };

export interface GeocodingPort {
  /**
   * 좌표를 장소 이름으로 바꾼다.
   *
   * **예외를 던지지 않는다** — 권한 거부·오프라인·API 실패 모두
   * `{ kind: "unknown" }`로 같다(research.md §3, 원칙 IV — 판정 갈래를 늘리지
   * 않는다). 이름을 여러 개 주더라도 이 포트가 사람이 읽을 문자열 하나로 이미
   * 합쳐 돌려준다 — 호출자는 원시 응답 구조를 모른다.
   */
  reverseGeocode(coordinate: { latitude: number; longitude: number }): Promise<GeocodingResult>;
}

export function expoGeocodingPort(): GeocodingPort {
  // expo-location의 reverseGeocodeAsync를 감싼다. 지연 import(005·011·013과 같은 패턴).
}
```

## 9. 파이프라인 입력 확장 (`src/diary/pipeline.ts`)

`PipelineInput`에 지오코딩 여부를 판단할 정보가 필요하다 — 설정값과 포트는 밖에서
주입된다(`PipelineDeps`에 `geocoding?: GeocodingPort` 추가, 설정 자체는 화면이 읽어
`request` 또는 별도 인자로 넘긴다). 정확한 배선은 `contracts/place-name.md`가
정한다.

## 상태 전이 없음

이 기능은 새로운 상태 기계를 도입하지 않는다 — `PipelineStage`·`AppScreen`
유니온에 새 갈래를 추가하지 않는다(사진 표시·소요 시간·장소명 모두 기존 `written`/
`detail` 상태 안의 데이터 확장일 뿐, 새로운 화면 전이가 아니다).
