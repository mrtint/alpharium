# Phase 0: 조사

**기능**: 사진 신호 수집 | **Date**: 2026-08-14

명세가 계획 단계로 넘긴 것과, 계획을 세우며 확인해야 했던 것을 여기서 푼다.

**실측과 추측을 구분해 적는다**(헌법 원칙 V). 아래에서 「확인」은 이 저장소에 설치된
`expo-media-library 57.0.3`의 타입 정의를 직접 읽은 것이고, 「판단」은 근거를 들어 고른
것이며, 「미확인」은 아직 재지 않은 것이다. **미확인을 확인인 척 적지 않는다.**

---

## §1. 사진 목록을 무엇으로 얻는가

**결정**: `expo-media-library 57`의 **새 API(`Query` + `exeForMetadata()`)**를 쓴다.
레거시 `getAssetsAsync`를 쓰지 않는다.

**확인** (`build/next/Query.d.ts`, `build/types/AssetMetadata.d.ts` 직접 읽음):

```
new Query()
  .gte(AssetField.CREATION_TIME, ms)   // 하루의 시작
  .lt(AssetField.CREATION_TIME, ms)    // 하루의 끝
  .eq(AssetField.MEDIA_TYPE, MediaType.photo)
  .orderBy(AssetField.CREATION_TIME)
  .limit(n) / .offset(n)
  .exeForMetadata(): Promise<AssetMetadata[]>   // 가벼운 메타데이터
  .exe(): Promise<Asset[]>                      // 무거운 객체
```

`AssetMetadata`는 `{ id, filename, mediaType, width, height, duration, creationTime,
modificationTime, isFavorite }`이며 **파일 경로를 풀거나 파일을 열지 않는다**(타입 주석에
"without resolving file paths or decoding files"라고 명시).

**근거 — 이것이 FR-005(내용을 읽지 않는다)를 구조로 보장한다.** `exeForMetadata()`는
픽셀에 닿을 방법 자체가 없다. `exe()`가 주는 `Asset`에는 `getUri()`·`getExif()`가 달려
있어 실수로 내용에 닿을 길이 열리지만, 메타데이터 경로에는 그 문이 없다. 헌법 원칙과
다음 기능의 경계를 **호출하는 API 선택으로** 지키는 셈이다.

**FR-002(04:00 경계)가 질의로 내려간다**: `gte`/`lt`에 하루의 시작·끝을 밀리초로 주면
경계 판정이 네이티브에서 끝난다. 전부 가져와 JS에서 거르지 않는다.

**FR-004(찍힌 시각 순서)가 질의로 내려간다**: `orderBy(CREATION_TIME)`.

**대안으로 검토한 것**:
- *레거시 `getAssetsAsync({ createdAfter, createdBefore })`* — 기각. 같은 일을 하지만
  57에서 `next` API가 정식이고, 마이그레이션 문서가 `getAssetInfoAsync` → `asset.getExif()`
  전환을 안내한다. 새로 쓰는 코드가 레거시에 붙을 이유가 없다.
- *전부 가져와 JS에서 거르기* — 기각. 사진이 수천 장인 기기에서 하루를 묻는 데 전체를
  훑게 된다.

---

## §2. 「일부 사진만 허용」을 판정할 수 있는가 — **명세의 가정을 고쳐야 한다**

**결정**: `accessPrivileges`로 판정하되, **안드로이드에서 이 값이 `limited`로 오는지는
실기기에서 확인해야 한다.** 확인 전까지 FR-008을 「확인된 사실」로 적지 않는다.

**확인** (`build/MediaLibraryNext.types.d.ts` 직접 읽음):

```
export type PermissionResponse = EXPermissionResponse & {
    accessPrivileges?: 'all' | 'limited' | 'none';
};
// EXPermissionResponse = { status, expires, granted, canAskAgain }
```

값이 **선택적(`?`)**이라는 점이 중요하다. 타입만으로는 어느 플랫폼이 이것을 채우는지 알 수
없다.

**확인** (`plugin/src/withMediaLibrary.ts`, context7): 이 패키지의 config plugin은 안드로이드
매니페스트에 `READ_MEDIA_VISUAL_USER_SELECTED`를 **항상** 넣는다. 즉 안드로이드 14+의
「일부 사진만 허용」 흐름이 이 패키지의 사정권 안에 있다.

**미확인 — 그리고 이것이 이 기능의 가장 큰 미지수다**: context7이 준 `accessPrivileges`
구현 근거는 **iOS 코드(`ImagePickerPermissionRequesters.swift`)**였다. 안드로이드에서
「일부만 허용」일 때 `accessPrivileges`가 `'limited'`로 오는지, 아니면 `granted: true` +
`accessPrivileges: undefined`로 오는지 **재지 않았다.**

**이것이 왜 중대한가**: FR-008은 「일부만 허용」을 `unknown`으로 판정하라고 요구하는데,
안드로이드가 이 상태를 「전체 허용」과 구분해 주지 않으면 **FR-008을 지킬 방법이 없다.**
그러면 부분적으로 본 사진 목록이 `known`으로 나가고, 그것이 정확히 헌법 원칙 V가 막으려는
거짓이다.

**실측 (2026-08-16, SM-G986N, Android 13)** — **전체 허용만 쟀고 「일부만 허용」은 아직
재지 않았다.**

「모두 허용」을 골랐을 때:

| 관측처 | 값 |
| --- | --- |
| 앱의 `photoPermission()` | `granted` → 화면에 「허용됨」 |
| `dumpsys`의 `READ_MEDIA_IMAGES` | `granted=true, flags=[USER_SET]` |
| `dumpsys`의 `READ_MEDIA_VISUAL_USER_SELECTED` | 선언만 있고 런타임 부여 없음 |

**이것은 예상된 갈래이며 FR-008이 다루는 상태가 아니다.** 「일부 사진만 허용」을 골랐을 때
`accessPrivileges`가 `limited`로 오는지는 **여전히 미확인**이다.

**다만 이 미확인의 무게가 줄었다** — 저장소 소유자의 판단으로 **제품이 「모두 허용」을
전제한다**(아래 §2a). 「일부만 허용」은 제품이 요구하는 상태가 아니므로, 그 갈래의 판정이
정확한지는 **일기가 나오는 정상 경로를 좌우하지 않는다.**

**그래도 코드는 `limited`를 `unknown`으로 다루는 채로 둔다.** 사용자가 설정에서 그렇게
바꿀 수 있고, 그때 부분적으로 본 목록을 `known`으로 내보내면 원칙 V가 깨진다. 판정이
발동하는지 재지 못했을 뿐 판정 자체는 옳다.

**남은 확인**: 「사진 및 동영상 선택」으로 바꿔 `limited`가 오는지 본다. 오지 않으면
`granted`로 보이므로 **부분 접근을 전체로 오인한다** — 그때는 FR-008을 지킬 수 없다는
사실을 명세에 적는다. 지금 적지 않는 것은 **재지 않은 것을 잰 척하지 않기 위해서다.**

**대안으로 검토한 것**:
- *`granted && !canAskAgain`으로 추정* — 기각. 두 값의 조합은 「일부 허용」의 신호가 아니다.
  추정으로 원칙 V의 방어선을 세울 수 없다.
- *사진 수가 적으면 일부 허용으로 간주* — 기각. 사진을 정말 두 장 찍은 날과 구분 불가능하다.
  이것이 바로 「없음」과 「모름」을 뭉개는 것이다.

---

## §2a. 제품은 「모두 허용」을 전제한다

**결정**(저장소 소유자, 2026-08-16): 이 앱은 **전체 사진 접근을 요구한다.**

**근거**: 이 앱은 주인이 조작하지 않아도 **하루가 끝나면 스스로 일기를 쓴다.** 「일부만
허용」에서는 사용자가 그때마다 사진을 다시 골라 줘야 하고, 그러면 「휴대폰이 알아서
쓴다」가 성립하지 않는다. 헌법 「이 앱이 무엇인가」가 말하는 제품이 아니게 된다.

**귀결**:

- 「일부만 허용」은 **제품이 요구하는 상태가 아니다.** 정상 경로가 아니라 사용자가
  설정에서 만들 수 있는 예외 상태다.
- 그 상태에서 `photos`를 `unknown`으로 두는 것은 **여전히 옳다**(FR-008) — 부분적으로 본
  목록을 그날의 전부인 양 내보내지 않는다.
- 다만 그 판정이 **실제로 발동하는지는 재지 못했다**(§2). 안드로이드가 구분해 주지 않으면
  발동하지 않고, 그때는 부분 접근이 전체로 오인된다.

**이 미확인을 안고 가는 이유**: 정상 경로(모두 허용)는 실기기에서 확인됐고, 미확인 갈래는
제품이 유도하지 않는 상태다. 축 하나를 더 파는 대신 남겨 둔다.

## §3. 좌표를 어떻게 읽는가

**결정**: `Asset.getLocation()`을 쓴다. `getExif()`를 쓰지 않는다.

**확인** (`build/types/Asset.d.ts`, `build/types/Location.d.ts` 직접 읽음):

```
getLocation(): Promise<Location | null>   // Location = { latitude, longitude }
  // "On Android, this method requires the ACCESS_MEDIA_LOCATION permission"
  // "@throws ... if the permission is not granted on Android"
getExif(): Promise<{ [key: string]: any }>
```

**근거 — `getLocation()`이 `getExif()`보다 나은 이유가 셋이다**:

1. **타입이 있다.** `getExif()`는 `{ [key: string]: any }`라 좌표를 꺼내려면 EXIF 태그
   이름과 도분초 변환을 우리가 떠안는다. `getLocation()`은 `{ latitude, longitude }`를 준다.
2. **필요한 것만 읽는다.** 우리는 좌표만 필요하고 나머지 EXIF는 쓰지 않는다.
3. **FR-005(내용을 읽지 않는다)와 어긋나지 않는다.** 둘 다 메타데이터이지만
   `getLocation()`은 의도가 좁아 「사진을 본다」로 자라날 여지가 없다.

**중요 — 권한이 없으면 `throw` 한다**(타입 주석 명시). `null`이 아니라 예외다. 그래서
FR-012(예외로 파이프라인을 무너뜨리지 않는다)를 지키려면 **이 호출을 반드시 감싸야 한다.**
감싸지 않으면 좌표 권한이 없는 기기에서 사진 신호 전체가 무너진다 — FR-013a(한쪽의 실패가
다른 쪽을 오염시키지 않는다)가 여기서 깨진다.

**FR-013a가 구현에서 성립하는 방식**: 사진 목록은 `exeForMetadata()`로 이미 얻은 뒤이고,
좌표는 그 후에 따로 묻는다. 좌표 단계가 통째로 실패해도 `photos`는 이미 손에 있다.

**주의 — 좌표는 `Asset`에 달려 있고 `AssetMetadata`에는 없다.** 즉 좌표를 읽으려면
`exe()`로 `Asset`을 받아야 하고, 이것은 §1에서 "무거운 객체"라고 한 그것이다. 사진 수만큼
`getLocation()`을 부르는 비용이 든다(FR-014의 상한이 여기서도 방어선이 된다).

---

## §4. 「같은 자리」를 어떻게 세는가

**결정**: 좌표 사이 거리를 **하버사인(haversine)**으로 재고, 100m 안이면 한 자리로 묶는다.
새 의존성을 들이지 않는다.

**판단 — 왜 하버사인인가**: 구면 위 두 점의 거리 공식이며 수식이 짧아 직접 쓴다. 100m
규모에서는 평면 근사로도 충분하지만, 위도에 따라 경도 1도의 실제 거리가 달라져서 근사는
고위도에서 틀린다. 공식이 다섯 줄이므로 근사할 이유가 없다.

**묶는 방식은 순차 묶기(sequential clustering)로 한다**: 시각 순으로 훑으면서 직전 자리의
중심과 100m 안이면 같은 자리, 아니면 새 자리. **판단이며 최적이 아니다** — 진짜 군집화는
하루 종일 천천히 이동한 경우 자리를 잘게 쪼갠다. 다만 이 앱은 "정확한 기록 장치가 아니라
감상"이고(헌법), 자리 수는 짐작이면 충분하다.

**`PlaceTrace`의 두 필드가 각각 무엇이 되는가**:

| 필드 | 사진에서 얻을 때의 뜻 |
| --- | --- |
| `visitCount` | 100m 규칙으로 묶은 자리의 수 |
| `approximateDistanceMeters` | 자리들을 시각 순으로 이은 거리의 합 |

**후자가 실제 이동 거리가 아니라는 것이 FR-013e다.** 집→회사→집이면 사진이 집·회사에서만
찍혔을 때 왕복이 잡히지만, 회사에서만 찍었으면 0이 된다. 이 한계가 값에 함께 담긴다
(FR-025).

**100m는 짐작이다**(FR-013h). 근거는 GPS 오차가 통상 수~수십 미터라는 일반 지식이고,
이 저장소가 잰 값이 아니다.

---

## §5. 어디까지가 기기에 닿는 자리인가

**결정**: 003의 구조를 그대로 따른다 — **포트 인터페이스 + expo 구현 한 자리**.

**확인** (`src/models/port.ts`, `src/models/expo-port.ts`): 003이 `ModelFilePort` 등을
정의하고 `expo-port.ts`에서만 실제 모듈을 지연 import 했다. 002의 `FileSystemPort`도 같다.

**004에 그대로 적용한다**:

```
src/signals/port.ts       ← 사진 통로의 모양 (기기 없이 대역으로 대체)
src/signals/expo-port.ts  ← expo-media-library를 부르는 유일한 자리
src/signals/collect.ts    ← 판정과 조립. 순수 함수
src/signals/places.ts     ← 좌표 묶기. 순수 함수
```

**근거**: FR-017이 요구하는 바이며, SC-007(기기 없이 조합 검증)이 이 구조 없이는 불가능하다.
`collect.ts`가 포트를 주입받으면 권한 네 갈래 × 신호 세 갈래를 대역으로 다 만들 수 있다.

**지연 import 한다** — 001·002·003과 같은 이유. 모듈 해석이 실패할 수 있는 환경(웹·테스트)에서
파일을 불러오는 것만으로 무너지지 않게 한다.

---

## §6. 파이프라인에 어떻게 꽂는가

**결정**: `PipelineDeps.loadSignals`를 갈아끼운다. **파이프라인 코드를 고치지 않는다.**

**확인** (`src/diary/pipeline.ts` 직접 읽음):

```
export type PipelineDeps = {
  /** 이 기능에서는 가짜 신호. 다음 기능에서 실제 수집으로 갈아끼운다 */
  loadSignals: (day: DayDate) => Promise<DaySignals | null>;
  ...
}
```

**002가 이 자리를 미리 열어 두었고 주석에 「다음 기능에서 실제 수집으로 갈아끼운다」고 적어
두었다.** 004는 그 주석이 말한 그 기능이다. 파이프라인의 `signals` 단계도 이미 있다.

**`fake.ts`는 그대로 둔다**(FR-018). 테스트가 쓰고 있고, 제품 경로가 아니라는 경계도 그대로다.

---

## §7. 상한을 얼마로 두는가

**결정**: **하루 200장**. 넘으면 이른 시각부터 200장을 담고 잘렸다고 표시한다(FR-014a·b).

**판단이며 실측이 아니다.** 근거는 두 가지다.

1. 좌표를 읽으려면 사진 하나마다 `getLocation()`을 부른다(§3). 200번의 네이티브 왕복은
   감당할 만하고, 2000번은 아니다.
2. 하루 200장을 넘기는 날은 드물고, 그런 날의 일기는 어차피 "사진을 아주 많이 찍었다"는
   서술이 된다. 정확한 수가 필요하지 않다(FR-014d).

**고칠 수 있는 값이다.** 실기기에서 200장의 좌표를 읽는 시간을 재면 근거가 실측으로 바뀐다.

---

## §8. 앱 설정에 무엇을 더해야 하는가

**결정**: `app.json`에 `expo-media-library` 플러그인을 넣고 좌표 접근을 켠다.

**확인** (`plugin/src/withMediaLibrary.ts`, context7):

```
Props = {
  isAccessMediaLocationEnabled?: boolean;   // ACCESS_MEDIA_LOCATION
  granularPermissions?: ('photo'|'video'|'audio')[];  // 기본값: 셋 다
}
```

**`granularPermissions: ['photo']`로 좁힌다.** 이 앱은 사진만 본다. 기본값을 두면
`READ_MEDIA_VIDEO`·`READ_MEDIA_AUDIO`까지 매니페스트에 들어가고, 그것은 우리가 쓰지 않는
권한을 사용자에게 요구하는 것이다.

**`isAccessMediaLocationEnabled: true`** — FR-013이 요구한다. 이것 없이는 `getLocation()`이
안드로이드에서 항상 실패한다.

**주의 — 이 변경은 네이티브 빌드를 다시 해야 반영된다.** `npx expo run:android`를 다시
돌려야 하며, Metro 재시작만으로는 매니페스트가 바뀌지 않는다.

---

## §9. 헌법 검사기에 무엇을 더할 것인가

**결정**: **더하지 않는다.**

`scripts/constitution-rules.ts`는 **설정 파일의 금지된 키**를 본다(원격 API 주소, 대체 응답
스위치). 004가 들이는 위험 — 권한 없음을 빈 목록으로 바꾸는 것 — 은 설정 키가 아니라
**코드의 판정 로직**이고, 그것은 테스트가 잡는다(SC-002).

이 경계는 `constitution-rules.ts` 주석에 이미 적혀 있다. 검사기를 코드 판정으로 넓히는 것은
그 파일이 스스로 금지한 확장이다.

---

## 남은 미지수 — 실기기에서 풀어야 하는 것

| # | 무엇 | 왜 지금 답할 수 없는가 | 어디서 푸는가 |
| --- | --- | --- | --- |
| 1 | 안드로이드가 「일부만 허용」을 `limited`로 주는가 | 타입이 선택적이고 근거 구현이 iOS였다 | quickstart D1 — **구현 초반** |
| 2 | 200장 상한이 적절한가 | 좌표 읽기 시간을 재지 않았다 | quickstart D4 |
| 3 | 100m가 적절한가 | 실제 사진으로 자리 수를 세어 보지 않았다 | quickstart D5 |

**1번이 명세를 바꿀 수 있다**(§2). 나머지 둘은 값만 조정된다.
