# Contract: 장소명

FR-004~009 (clarify 2026-08-23 Q2)의 계약이다.

## 불변식

**L1. 기본값은 꺼짐이다.** `loadGeocodingSetting()`이 저장된 값을 못 읽으면(파일
없음·깨짐·`false`) 꺼짐으로 취급한다 — "고른 적 없음"과 "껐음"을 화면에서 구분해
보여줄 필요가 없다(vision-setting과 다른 점, data-model.md §7).

**L2. 설정이 꺼진 동안 지오코딩을 시도하지 않는다.** `pipeline.ts`가 지오코딩
포트를 부르는 유일한 조건은 "설정이 켜짐 AND `representativeCoordinate`가
있음"이다. 둘 중 하나라도 아니면 `DiaryEntry.placeName` 필드 자체가 없다 — 화면은
지금과 똑같이 `signalLines()`의 "다닌 자리: N곳"만 보인다(FR-005, 회귀 없음).

**L3. 지오코딩은 일기 생성 시점에 정확히 한 번 수행된다.** 화면을 열 때마다
다시 묻지 않는다 — 결과(`known`/`unknown`)를 `DiaryEntry.placeName`에 저장하고
그것을 그대로 읽는다.

**L4. 화면과 프롬프트는 같은 값을 읽는다("두 개의 진실" 금지, FR-008).**
`buildPrompt()`가 장소 이름을 문장에 넣을 때와 `DiaryDetailScreen`이 화면에
그릴 때 **둘 다 `DiaryEntry.placeName`(정확히는 생성 시점엔 아직 저장 전이므로
같은 값을 담은 지역 변수) 하나만 읽는다.** 두 곳이 각자 지오코딩을 다시 부르지
않는다 — 한 번 부른 결과를 양쪽이 나눠 쓴다.

**L5. `known`/`unknown`을 구분한다(원칙 V).** 좌표는 있었으나
`reverseGeocode()`가 이름을 못 준 경우(권한 거부·오프라인·API 실패 전부 포함,
research.md §3) `{ kind: "unknown" }`이다. 화면은 "모른다"로, 좌표 자체가
없어 시도조차 안 한 경우와는 다른 표시를 한다(좌표 없음 → 필드 자체가 없음 →
기존 "다닌 자리: N곳" 표시만).

**L6. 대표 장소 하나만 표시한다(clarify 결정).** 방문지가 여럿이어도
`representativeCoordinate`(자리 목록의 첫 원소, research.md §2)에 대응하는
이름 하나만 얻는다 — 방문지 클러스터별로 여러 번 지오코딩하지 않는다.

**L7. 화면 표시 형식은 "대표 장소 · N곳"이다.** `N`은 기존
`trace.visitCount`를 그대로 쓴다 — 새 카운팅을 만들지 않는다.

## 권한 (research.md §3)

**L8. 설정을 켜는 순간 위치 런타임 권한을 요청한다.** 거부되면 이후 모든
`reverseGeocode()` 호출이 `unknown`으로 귀결된다(별도 "권한 없음" 갈래를 만들지
않는다, L5의 확장). 이 문서 작성 시점에는 문서 기반 추정이며, quickstart.md D1이
실기기에서 확인한다.

## 흐름

```
pipeline.ts 5단계(생성) 성공
  → signals.places가 known이고 trace.representativeCoordinate가 있고
    설정이 켜져 있으면:
      geocoding.reverseGeocode(representativeCoordinate) 호출
      → known: buildPrompt()가 이미 이 값을 프롬프트에 반영한 상태였어야 하므로
        (L4), 실제로는 지오코딩 호출이 buildPrompt() *이전*에 일어나야 한다
        — 순서는 contracts 재조정: 4단계(요청 생성)와 5단계(생성) 사이에 위치
      → unknown: 프롬프트에는 아무것도 추가되지 않는다(지금처럼 자리 수만 언급)
  → entry 조립 시 placeName을 결과에 싣는다(known/unknown), 시도 안 했으면 없음
```

**★ 순서 주의**: L4를 지키려면 지오코딩 호출이 `buildPrompt()`보다 먼저 일어나야
한다 — `DiaryRequest`가 만들어진 뒤, `backend.generate()`를 부르기 전이
자연스럽다. `PipelineDeps`에 `geocoding?: GeocodingPort`를 추가하고, `runStages()`
4단계 직후·5단계 직전에 삽입한다(tasks.md에서 정확한 스텝 번호를 매긴다).

## 테스트로 확인해야 하는 것

- `geocoding-port.test.ts`: 성공/빈 응답/예외 세 입력이 모두 `known`/`unknown`
  두 갈래로만 귀결되는지(예외를 던지지 않는지).
- `places.test.ts`: `representativeCoordinate`가 첫 자리로 정확히 나오는지,
  좌표가 없으면 필드 자체가 없는지.
- `pipeline.test.ts`: 설정 꺼짐/좌표 없음 조합 각각에서 지오코딩 포트가
  호출되지 않는지(스파이로 확인), 설정 켜짐+좌표 있음에서 정확히 1회만
  호출되는지, 화면용 값과 프롬프트용 값이 같은 호출 결과에서 왔는지.
- `DiaryDetailScreen.test.tsx`: `placeName` 없음/`unknown`/`known` 세 상태의
  렌더링 문구가 서로 다른지, 없음일 때 기존 "다닌 자리: N곳"과 완전히 같은
  텍스트인지(회귀 확인).
