# 신호 확장 타당성 — 핸드오프

**작성**: 2026-10-06 · **교차 검증·065 반영**: 2026-10-07(§10)
**성격**: 조사 보고 + 다음 스펙의 입력. **코드 변경 없음.**
**읽는 사람**: 신호 축을 늘리는 스펙을 열 사람.

## 0. 한 장 요약

**질문**: 지금 신호는 사진과 장소뿐이고, 장소조차 사진 EXIF에서 나온다
(`PhotoPlaces.source: "photo-exif"`). 신호를 실질적으로 늘릴 방법은 무엇인가.

**답**:

1. **양 플랫폼에서 쉽게 되는 것은 셋뿐이다** — 사진 메타 해상도(권한 0), 앱 자신의
   흔적(권한 0), 캘린더(일반 권한 1). 이 중 **새로 생기는 축은 캘린더 하나**이고,
   건강(걸음·수면)이 반 개다(iOS는 쉽고 Android는 조건이 붙는다).
2. **한 범주가 통째로 닫혀 있다** — 「다른 앱이 가진 것」(알림, 유튜브, 앱 사용 시간)과
   「다른 사람과의 통신」(통화, 메시지). 하나씩 막힌 것이 아니라 두 플랫폼이 같은 선을
   긋고 있어서, 정책이 느슨해질 영역이 아니다(§4).
3. **값이 가장 큰 축(사진 밖의 실제 위치)이 값이 가장 비싸다** — 되짚는 API가 없어
   기록 계층이 필요하고, Play 배경 위치 심사가 붙는다. 065에서 배터리 예외 권한을
   걷은 뒤로는 배경 잡이 대부분의 기기에서 하루 1~2회라 기록 계층의 표본 자체가
   모자란다(§2.2 #8). 되돌릴 수 없는 비용은 결론이 난 뒤에 쓴다.

**권고 1순위는 사진 메타 해상도, 2순위는 캘린더다**(§3). 둘 다 심사가 없다.

> [!IMPORTANT]
> 이 문서의 평가(가치·난이도·위험)는 **전부 판단이며 실측이 아니다**. 실측값과
> 문서 확인 사항, 아직 안 재 본 것을 §6에서 가른다(헌법 원칙 V).

---

## 1. 평가 항목 — 이 표를 읽는 열한 개 축

| 항목 | 묻는 것 | 왜 보는가 |
| --- | --- | --- |
| **성격** | 새 축인가, 가진 축의 해상도인가 | 「축을 늘린다」와 「더 잘게 읽는다」는 비용이 다르다 |
| **되짚기** | 어제 구간을 질의하는 API가 있는가 | **이 저장소에서 가장 중요한 축.** 없으면 그날 쌓아야 하고(기록 계층), `battery`·`connectivity`가 꺼져 있는 이유가 이것이다 |
| **플랫폼 대칭** | 양쪽이 같은 값을 주는가 | 비대칭이면 같은 앱이 기기마다 다른 일기를 쓴다 |
| **권한 비용** | 사용자에게 몇 개를 묻는가 | 권한은 021 통합 흐름에 추가된다 — 늘면 첫 실행이 길어진다 |
| **심사** | 스토어 선언서·엔타이틀먼트가 붙는가 | 되돌릴 수 없는 비용이다 |
| **구현 난이도** | 쉬움(기존 라이브러리+포트 하나) / 보통(새 라이브러리·플러그인) / 어려움(네이티브 모듈 또는 기록 계층) | |
| **일기 가치** | 사진 없는 하루를 구제하는가, 단서가 구체적인가 | 품질이 가장 나쁜 하루가 사진 없는 하루다 |
| **공백 위험** | 사람에 따라 `none`·`unknown`이 될 빈도 | 축을 늘려도 비는 하루는 그대로 남는다 |
| **신뢰 비용** | 사용자가 느끼는 침습성 | 「사진을 보는 앱」과 「항상 따라다니는 앱」은 다른 약속이다 |
| **선행 의존** | 먼저 있어야 하는 것 | 기록 계층·네이티브 모듈은 여러 축이 공유한다 |
| **프롬프트 위험** | 축이 늘면 모델 출력이 나빠질 위험 | 재료 과다가 지어내기를 늘린 측정이 있다(§6) |

---

## 2. 신호 평가표

### 2.1 요약 (살아남은 후보)

| # | 후보 | 성격 | 되짚기 | iOS | Android | 권한 | 심사 | 난이도 | 가치 | 공백 | 신뢰 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 사진 메타 해상도(**사진만**) | 해상도 | ✅ | ✅ | ✅ | **0** | 없음 | 쉬움 | 중간 | 낮음 | 낮음 |
| 2 | 앱 자신의 흔적 | 새 축 | ✅ | ✅ | ✅ | **0** | 없음 | 쉬움 | 작음 | 낮음 | 낮음 |
| 3 | 캘린더 | 새 축 | ✅ | ✅ | ✅ | 1 | 없음 | 쉬움 | **큼** | 중간 | 중간 |
| 4 | 걸음·수면·운동 | 새 축 | ✅ | ✅ | ⚠️ | 1~3 | **Android 선언서** | 보통 | 중간 | 높음 | 낮음 |
| 5 | 활동 종류(걷기/차/정지) | 새 축 | ✅ iOS만 | ✅ | ❌ | 1 | 없음 | 어려움 | 중간 | 낮음 | 낮음 |
| 6 | 당일 동영상·음원·녹음 | 새 축 | ⚠️ | ⚠️ 동영상만 | ✅ | Android 2 | 동영상은 사진 신고서에 합류 | 보통 | 중간 | 중간 | 낮음 |
| 7 | 배터리·연결 | 되살림 | ❌ | ⚠️ | ⚠️ | 0 | 없음 | 어려움 | 작음 | 낮음 | 낮음 |
| 8 | **긴 주기 위치** | 새 축 | ❌ | ⚠️ | ⚠️ | 1~2 | **Play 선언서+영상** | 어려움 | **큼** | 낮음 | **높음** |
| 9 | 당일 다운로드 파일 | 새 축 | ✅ | ❌ | ⚠️ | 폴더 선택 | 없음 | 보통 | 작음 | 높음 | 중간 |

**보류**(결정이 필요하다, §5): 날씨 · iOS JournalingSuggestions
**제외**(§4): 알림 · 통화 이력 · SMS · 앱 사용 시간 · 유튜브/유튜브 뮤직 · 구글 계정 활동 · 음악 재생 이력 · 모든 파일 접근 · 접근성 서비스 · iOS 스크린타임

### 2.2 후보별 상세와 구현 참고

#### 1. 사진 메타 해상도 — 권한 0

**무엇을 얻는가**: 같은 「사진 5장」을 여러 하루로 가른다. 스크린샷만 열두 장인 하루,
즐겨찾기한 한 장이 있는 하루, 23시에 몰린 사진.

**통로**: 이미 쓰는 `expo-media-library` 57의 새 API. 값이 두 층으로 나뉜다 —
**싼 층**과 **비싼 층**을 가르는 것이 이 축의 설계 전부다.

| 층 | 얻는 것 | 호출 |
| --- | --- | --- |
| 싼 층 | `AssetMetadata`의 `filename`·`width`·`height`·`creationTime`·`modificationTime`·`isFavorite` | `photosBetween()`이 이미 부르는 `Query…exeForMetadata()` **한 번** — 사진마다 부르지 않는다 |
| 비싼 층 | `Asset.getExif()`(ISO·플래시·초점거리 등), `getUri()` → 폴더 이름 | 사진마다 한 번. 폴더 이름은 **023에서 상한에 닿은 하루만** 부른다 |

**구현 참고**:
- **촬영 시각 분포·즐겨찾기·가로세로 비는 싼 층에서 나온다** — 지금 `expo-port.ts`가
  `id`·`creationTime`만 남기고 버리는 필드다. 1번 축의 첫걸음은 새 호출이 아니라
  「버리던 것을 남기기」다.
- **`getMediaSubtypes()`는 iOS 전용이다**(설치본 `@platform ios`). 값도 `screenshot`·
  `livePhoto`·`panorama`·`hdr` 등이고 **셀피·버스트는 없다.** Android의 스크린샷 판별은
  023의 폴더 이름(또는 `filename` 접두사)으로 한다 — 플랫폼마다 다른 통로로 같은 값을 낸다.
- **동영상은 이 축에 넣지 않는다.** 지금 질의가 `MediaType.IMAGE`로 거르고, 앱이
  `granularPermissions: ["photo"]`(→ `READ_MEDIA_IMAGES`)만 받는다. Android에서 동영상을
  세려면 `READ_MEDIA_VIDEO`가 새로 필요하다(iOS는 사진 권한에 포함) — 권한 0이 아니다.
  6번 축으로 옮겼다.
- `PhotoObservation.complete`가 이미 상한을 값에 붙이고 있다 — 새 필드도 같은 규칙을
  따른다(목록만 꺼내는 편의 함수 금지, `types.ts` FR-027).
- EXIF는 기기·앱마다 필드가 다르다. 없는 필드를 0으로 채우지 않는다(원칙 V). ISO·플래시로
  「실내였다」「밤이었다」를 단언하면 짐작을 사실로 옮기는 것이다 — 비싼 층은 싼 층을
  프롬프트에 올려 본 뒤에 판단한다.

#### 2. 앱 자신의 흔적 — 권한 0

**무엇을 얻는가**: 어제 앱을 몇 번 열었나, 어제 일기를 읽었나, 며칠 연속 썼나.

**통로**: 포켓로그가 직접 적는다. 외부 API가 없다.

**구현 참고**:
- **화자 문제가 있다.** 「주인이 나(휴대폰)를 몇 번 열었다」는 원칙 II의 시야에 맞지만,
  일기가 자기 앱 이야기만 하게 되면 재료가 아니라 잡음이다. 프롬프트 투입 전 측정이
  특히 필요한 축이다.
- 기록 자리는 `preferences/`(020 `notified.json` 관례)이지 `DiaryEntry`가 아니다.

#### 3. 캘린더 — 권고 2순위

**무엇을 얻는가**: 사진이 없어도 「어제 14시에 무슨 일정이 있었나」를 아는 **유일하게
되짚히는 통로**. 사진 없는 하루를 구제한다.

**통로**: `expo-calendar` 57의 새 API — `getCalendars(EntityTypes.EVENT)` → `listEvents(calendars,
start, end)`. **`getEventsAsync()`는 57에서 호출하면 던진다**(설치본 `legacyWarnings`; 옛 API는
`expo-calendar/legacy`). Android 구현은 `CalendarContract.Instances`를 질의하므로 반복 일정이
펼쳐진 채 온다. iOS는 미리 알림도 읽는다(iOS 전용 API).

**구현 참고**:
- **일정은 계획이지 관측이 아니다.** 「14시에 회의가 잡혀 있었다」는 기록이고 「14시에
  회의를 했다」는 짐작이다(원칙 II·V). 프롬프트에는 「일정이 있었다」로만 싣는다. 같은 시각에
  사진이 있어도 코드가 둘을 이어 「했다」로 바꾸지 않는다.
- **플러그인이 `WRITE_CALENDAR`도 넣는다**(`withCalendar.js`가 `READ_CALENDAR`·`WRITE_CALENDAR`
  둘을 추가). 읽기만 하므로 `app.json`의 `blockedPermissions`에 `WRITE_CALENDAR`를 더한다
  (065가 배터리 권한을 걷은 것과 같은 자리). iOS는 `calendarPermission` 하나가
  `NSCalendarsUsageDescription`·`NSCalendarsFullAccessUsageDescription`을 함께 채운다.
- 배경 읽기에 따로 필요한 권한은 없다 — 런타임 권한 하나가 헤드리스 잡에서도 유효하다고
  본다(**미확인**, §6).
- **참석자·제목은 타인 정보다.** 일기 본문에 이름이 흐르지 않게 프롬프트 투입 형태를
  먼저 정한다(원칙 II와 별개로, 사용자가 동의해 줄 수 없는 데이터다).
- 종일 일정·반복 일정·여러 날 일정의 하루 귀속은 `dayBounds()`를 재사용한다 — 하루
  경계를 다시 계산하지 않는다(`collect.ts` FR-002).
- 구독 캘린더(공휴일·스포츠 일정)가 섞여 들어온다. 「내가 만든 일정」과 구분할지 정한다.

#### 4. 걸음·수면·운동 — AGENTS.md 정정이 필요한 축

**통로**: iOS는 HealthKit, Android는 **Health Connect**. 양쪽을 한 API로 덮는
`expo-healthkit`(Expo Modules)이나 `react-native-health-connect` v4(Expo 플러그인
내장) + iOS `react-native-health`.
걸음만이면 iOS는 `expo-sensors` Pedometer(`CMPedometer`, 7일 한도)로 끝난다.

**구현 참고**:
- **★ 공급자가 없으면 값이 빈다.** Health Connect는 저장소일 뿐이고 삼성 헬스·핏빗 같은
  공급자가 적어 주지 않으면 비어 있다. 그 빈 값은 「걷지 않았다」(`none`)가 아니라
  「아무도 안 적었다」(`unknown`)다 — **공급자 유무를 따로 관측해야 원칙 V가 지켜진다.**
  이것이 이 축의 가장 큰 함정이다.
- **배경 읽기 권한이 따로 있다**: `READ_HEALTH_DATA_IN_BACKGROUND`(라이브러리에서는
  `recordType: 'BackgroundAccessPermission'`으로 요청·조회). 포켓로그는 배경 자동 생성이
  기본이라 이것 없이는 자동 생성 경로에서 값이 안 온다. 다만 057 이후 앱을 열면 쓰는
  경로가 있으므로, 배경 권한을 거절한 사용자도 전경 쓰기에서는 값을 받는다.
- 하루 합계는 `aggregateRecord`/`aggregateGroupByPeriod`로 한 번에 받는다(원본 기록을
  세지 않는다 — 여러 공급자의 중복을 Health Connect가 걸러 준다).
- 기본 30일 한도(어제를 쓰는 데는 무관). 더 과거는 `READ_HEALTH_DATA_HISTORY`.
- **minSdk를 24 → 26으로 올려야 한다**(지금은 RN 기본 24). Android 7.x 기기가 설치
  대상에서 빠진다. targetSdk 36은 065에서 이미 충족했다.
- Play 콘솔 health 데이터 선언 + 개인정보처리방침.

#### 5. 활동 종류(걷기/차/정지) — iOS가 더 쉬운 드문 축

**통로**: iOS `CMMotionActivityManager.queryActivityStarting(from:to:)`이 **최근 7일을
되짚는다**(Motion & Fitness 권한). Expo가 노출하지 않아 작은 네이티브 모듈이 필요하다.
Android는 실시간 구독뿐이라 기록 계층이 필요하고, 사실상 4번(운동 세션)으로 합류한다.

**구현 참고**: prebuild + 자체 config plugin 셋(`plugins/with-*.js`)이 이미 있으므로
네이티브 모듈 추가에 구조적 장벽은 없다. iOS 전용 축이 하나 늘어난다는 점이 비용이다.

#### 6. 당일 동영상·음원·녹음 — Android 권한 둘, 시각 칸이 함정

**무엇을 얻는가**: 어제 찍은 영상(개수·길이), 어제 녹음한 파일, 어제 받은 음악. 녹음
파일은 단서로 강하다(회의·연주·메모). 동영상 길이는 1번 축에서 옮겨 왔다.

**통로**: 이미 쓰는 `expo-media-library`. `granularPermissions`에 `"video"`·`"audio"`를
더하면(→ `READ_MEDIA_VIDEO`·`READ_MEDIA_AUDIO`) 같은 `Query`에 `MediaType.VIDEO`·`AUDIO`로
묻는다. `AssetMetadata.duration`이 길이를 준다(싼 층).

**구현 참고**:
- **★ 날짜로 거르는 칸이 `DATE_TAKEN` 하나뿐이다.** 설치본 Android 구현에서
  `AssetField.CREATION_TIME`은 `DATE_TAKEN`으로, `MODIFICATION_TIME`은 `DATE_MODIFIED`로
  옮겨지고 `DATE_ADDED`로 거르는 길은 새 API·옛 API 모두 없다. 동영상은 `DATE_TAKEN`이
  채워지지만 **음원·녹음 파일은 비어 있을 가능성이 크다**(짐작, §6 미확인) — 그러면
  「그날의 녹음」은 `MODIFICATION_TIME`으로 물어야 하고, 받은 음악은 원본 파일의 수정
  시각을 달고 올 수 있다. 칸이 무엇을 뜻하는지 실기기에서 먼저 잰다.
- **동영상은 Play 사진·동영상 권한 정책 대상이다** — 065에서 `READ_MEDIA_IMAGES`에 쓴
  신고서에 동영상을 함께 적는다. 음원 권한은 그 정책 밖이다.
- iOS는 동영상이 사진 권한 안에 있지만 오디오 자산은 없다 — 오디오는 `unknown`이 아니라
  「이 플랫폼이 제공하지 않음」 사유로 내린다(`SignalValue.unknown.reason`의 기존 관례).
- 권한이 둘 늘면 021 통합 흐름이 길어진다. 동영상은 사진 단계와 한 번에 묻는다
  (`requestPermissionsAsync(false, ["photo", "video"])`), 음원은 따로다.
- **내용은 읽지 않는다.** 파일 이름·개수·시각·길이까지다. 녹음을 듣는 축을 열면 다른 제품이다.

#### 7. 배터리·연결 — 이미 자리가 있는 축

`DaySignals.battery`·`connectivity`와 타입이 이미 있고 `USER_VISIBLE_SIGNAL_AXES`에서
`false`다(「기록 계층이 없다 — 생기면 되살린다」). 기록 계층이 생기면 **8번과 함께 공짜로
살아난다** — 둘을 따로 열지 않는다.

**구현 참고**: `expo-battery`(`getPowerStateAsync` — 잔량·충전 상태·저전력 모드를 한 번에)·
`expo-network`를 배경 잡에서 샘플링한다. 둘 다 **그 순간의 값만** 준다. 065 이후 배경 잡은
대부분의 기기에서 하루 1~2회라(§2.2 #8) 「충전했는가」는 Android에서도 짐작 수준이다 —
iOS와 같은 처지가 됐다. 표본 수를 값에 붙인다.

#### 8. 긴 주기 위치 — 값이 가장 크고 가장 비싸다

**무엇을 얻는가**: 사진 밖의 자리. `PlaceTrace`를 사진을 안 찍은 하루에도 채운다.

**세 가지 방법**:

| 방법 | 내용 | 평가 |
| --- | --- | --- |
| A. 배경 위치 세션 | `Location.startLocationUpdatesAsync`. `timeInterval`은 **Android 전용**, Android는 `foregroundService` 필수(상시 알림) | iOS는 「30분마다」를 말할 수 없다 — 거리·사건 기반이 된다 |
| B. 15분 배경 잡에 좌표 한 점 | 이미 있는 `AUTO_DIARY_TASK` 콜백에서 `getCurrentPositionAsync()` 한 번 | 새 서비스·상시 알림 없음. **그러나 065 이후 표본이 모자란다** — 아래 |
| C. 사건 기반 | 지오펜싱 / iOS `CLVisit`(네이티브 모듈) | 배터리 최저, 의미가 `PlaceTrace`에 가장 가깝다. 장소를 미리 알아야 한다 |

**구현 참고**:
- **권한 없이는 잴 것이 없다.** 019 실측에 「앱이 전경에 있으면 배경 태스크가 아예 실행되지
  않는다」가 있고, Android 10+는 배경 좌표에 `ACCESS_BACKGROUND_LOCATION`을 요구한다.
  나눌 수 있는 단계는 「권한 없이 → 권한 있게」가 아니라 **「개발 빌드로 측정(심사 없음)
  → 결론 뒤에 출시·심사」**다.
- `PhotoPlaces.source` 유니온을 넓힌다 — 004 주석이 이 순간을 예고해 두었다.
- **띄엄띄엄한 표본으로 궤적을 단언하면 원칙 V가 깨진다.** 20분 간격 3점으로 「2km를
  움직였다」는 짐작이다. 표본 수와 최대 공백(`samples`, `maxGapMinutes`)을 값에 붙인다
  — `PhotoObservation.complete`와 같은 이유, 같은 패턴.
- iOS는 `BGTaskScheduler`가 「밤중 같은 특정 창」에만 돌고 스와이프 종료로 멈춘다. 하루
  몇 점이라 자리를 말할 표본이 안 된다 — iOS에서 이 축을 쓸 만하게 만드는 길은 방법 C뿐이다.
- **★ 065가 방법 B의 전제를 무너뜨렸다.** B를 권고한 근거는 019 실측의 「배터리 예외를
  주면 10~32분 간격」이었다. 065에서 Play 정책 때문에 `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`를
  걷었고(`app.json` `blockedPermissions`), 예외는 이제 사용자가 설정 목록에서 직접 꺼야
  한다(삼성 4탭, 딥링크 없음). 그 길을 끝까지 가는 사용자는 적다고 봐야 하므로 **대부분의
  기기에서 배경 잡은 019의 기본값 — 하루 1~2회**다. 하루 한두 점으로는 「자리」를 말할 수
  없다. 그래서 Android에서도 쓸 만한 길은 A(포그라운드 서비스 — 상시 알림과
  `FOREGROUND_SERVICE_LOCATION` 선언이 더 붙는다)나 C(지오펜싱)뿐이고, 이 축의 값은
  §3의 자리보다 더 비싸졌다.
- 전경 경로는 표본이 될 수 없다 — 057의 「앱을 열면 쓰는 중」에서 한 점을 찍을 수는 있지만
  그것은 「앱을 연 자리」이지 하루의 자리가 아니다.

#### 9. 당일 다운로드 파일 — Android 조건부

Scoped Storage로 다른 앱이 받은 문서는 못 읽는다. `MANAGE_EXTERNAL_STORAGE`는 Play
제한 권한(파일 관리자 전용)이라 **쓸 수 없다**. 남는 길은 SAF —
`expo-file-system`(legacy)의 `StorageAccessFramework`로 사용자가 Download 폴더를 한 번
고르면 계속 읽는다.

**구현 참고**: ⓐ legacy API에 있다, ⓑ **고른 폴더의 하위 디렉터리는 못 읽는다**
(expo/expo#20102), ⓒ 사용자가 폴더를 직접 골라야 해서 첫 실행 흐름이 길어진다. 가치가
작으므로 다른 축이 끝난 뒤에 다시 본다.

---

## 3. 권고 우선순위 (저장소 소유자 결정 대기)

> [!NOTE]
> **로드맵 규칙상 이것은 순서가 아니라 권고다.** `docs/roadmap/README.md`는 진행 전
> 항목에 우선순위·차수·스펙킷 번호를 적지 않는다. 이 문서도 번호를 매기지 않는다.

**판단에 쓴 기준 (앞에 올수록 무겁게 봤다)**:
① 지금 가능한가(권한·심사 0) → ② 일기 가치, 특히 사진 없는 하루 → ③ 양 플랫폼 대칭 →
④ 되짚히는가 → ⑤ 되돌릴 수 있는가

| 권고 | 후보 | 왜 이 자리인가 |
| --- | --- | --- |
| 권고 | 후보 | 왜 이 자리인가 | 교차 검증(§10) 뒤 |
| --- | --- | --- | --- |
| **1** | 사진 메타 해상도(사진만) | 권한 0·심사 0·되짚힘·양쪽 대칭. 다양성 대비 비용이 가장 낮다 | **유지·더 싸졌다.** 첫걸음은 이미 받는 `exeForMetadata()` 필드를 버리지 않는 것 — 새 호출 0. 동영상은 빠졌다(6번) |
| **2** | 캘린더 | **새로 생기는 유일한 보편 축**이고 사진 없는 하루를 구제한다. 비용은 권한 1개 | **유지.** 단 일정은 계획이라 「있었다」로만 싣는다. 57 새 API(`listEvents`)·`WRITE_CALENDAR` 걷기가 붙는다 |
| **3** | 앱 자신의 흔적 | 권한 0이지만 가치가 작고 화자 문제가 있다. 1·2의 빈자리를 메우는 용도 | 유지 |
| **4** | 걸음·수면·운동 | 가치는 중간, iOS는 쉽다. Android의 공급자 의존과 선언서가 발목이다 | 유지. minSdk 24→26 비용이 더해졌고, 057 전경 경로 덕에 배경 권한 거절이 치명적이지 않다 |
| **5** | 당일 동영상·음원·녹음 | 단서가 구체적이다 | **비용이 올랐다** — Android 권한 둘, 동영상은 Play 사진·동영상 신고 대상, 음원의 시각 칸이 미확인. 실측 하나(녹음 파일의 `DATE_TAKEN`)가 결론을 가른다 |
| **6** | **긴 주기 위치 + 배터리·연결**(한 묶음) | 가치는 2번과 맞먹지만 값이 가장 비싸다. 기록 계층 한 번으로 세 축이 살아나므로 묶어 연다 | **더 비싸졌다.** 065 이후 배경 잡이 하루 1~2회라 방법 B의 표본이 성립하지 않는다. 열려면 포그라운드 서비스(상시 알림)나 지오펜싱이라는 **제품 결정**이 먼저다 |
| **7** | iOS 활동 종류 | 되짚히고 깔끔하지만 iOS 전용 + 네이티브 모듈 | 유지 — 지금 배포 대상이 Android(Play)뿐이라 더 뒤로 밀려도 된다 |
| **8** | 당일 다운로드 파일 | 가치가 가장 작고 사용자 마찰이 있다 | 유지 |

**순서 자체는 바뀌지 않았다.** 바뀐 것은 1·2의 통로(57 새 API)와 5·6의 비용이다. 1·2가 앞에
선 근거(권한·심사 0~1, 되짚힘)는 설치본 코드로 확인됐고, 5·6이 뒤에 선 근거는 교차 검증에서
오히려 강해졌다.

**묶음 규칙**: 6번은 쪼개지 않는다. 기록 계층(배경 샘플링 + 저장)이 위치·배터리·연결의
공통 선행 의존이므로, 따로 열면 같은 계층을 두 번 만든다. 065 이후로는 그 계층의 표본을
무엇으로 모을지(포그라운드 서비스냐 사건 기반이냐)가 정해지기 전에는 열지 않는다.

**보류 두 개는 우선순위에 넣지 않는다** — 기술 판단이 아니라 제품·헌법 결정이 먼저다(§5).

---

## 4. 제외 목록과 근거 (다시 조사하지 않기 위해)

| 제외 | 왜 막혔나 | 되살아날 조건 |
| --- | --- | --- |
| 수신 알림·메시지 | iOS는 타 앱 알림 API가 **없다**. Android는 `NotificationListenerService`로 기술상 되지만 Play 허용 사례가 ①웨어러블 중계 ②알림 집계 ③대체 UI 셋이고 일기가 없다 | Play 정책 변경(가능성 낮음) |
| 통화 이력 | Android `READ_CALL_LOG`은 Play 제한 권한(기본 전화·문자 앱만). iOS는 API 없음 — `CXCallObserver`는 앱 실행 중 통화 상태만, 번호도 안 준다 | 없음 |
| SMS | 위와 같은 칸 | 없음 |
| 앱 사용 시간 | iOS는 Screen Time 데이터가 `DeviceActivityReport` 확장 **밖으로 나오지 못한다**(App Group·공유 파일 전부 막힘) + FamilyControls 배포 엔타이틀먼트 심사. Android는 특수 권한 + 패키지명→앱 이름 변환에 `QUERY_ALL_PACKAGES`(Play 제한) | 없음 |
| **유튜브·유튜브 뮤직** | 시청 기록은 Data API v3에서 **2016년 제거**(`watchHistory`는 빈 껍데기, history용 OAuth 스코프 없음). 유튜브 뮤직은 공식 API 자체가 없다. Takeout은 수동 | iOS만 — JournalingSuggestions의 Generic Media가 iOS 18부터 서드파티 재생(유튜브 포함)을 담는다(§5) |
| 구글 계정 활동 | My Activity·검색 기록·시청 기록 모두 공개 API 없음(Takeout 수동). 지도 타임라인은 기기 저장으로 이전. **Google Fit API는 2026년 말 종료**, 서버측 대체 없음 | 없음 — 살아 있는 통로는 Health Connect(4번)와 로컬 캘린더(3번)뿐 |
| 음악 재생 이력 | Android는 `MediaSessionManager`도 **알림 접근 권한**을 요구해 제외 축에 묶인다. iOS `MPMediaQuery`는 로컬 라이브러리만(스트리밍 제외) | 알림 축이 열리면 함께 |
| 모든 파일 접근 | `MANAGE_EXTERNAL_STORAGE`는 Play 제한 권한(파일 관리자·백업 앱) | 없음 — SAF(9번)로 대체 |
| 접근성 서비스 경유 | Play가 자율 동작 목적 사용을 금지 | 없음 |

**구조적 요약**: 제외된 것은 전부 **①다른 앱이 가진 것**과 **②다른 사람과의 통신**이다.
살아남은 것은 전부 **③사용자가 자기 기기에 남긴 기록**, **④센서가 그 사람의 몸에 대해 아는 것**,
**⑤앱 자신이 본 것**이다. 두 플랫폼이 같은 선을 긋고 있으므로, ①②를 노리는 후보는
앞으로도 조사 가치가 낮다.

---

## 5. 보류 — 기술이 아니라 결정이 필요한 둘

**날씨**: 좌표 + 날씨 API. 「어제 날씨」는 일기 다양성에 효과가 크지만 **좌표가 기기를
떠난다**. 원칙 I은 추론에 대한 조항이지만, 이 앱이 사용자와 맺은 약속은 그보다 넓다.
헌법 결정 없이 열지 않는다.

**iOS JournalingSuggestions**: 애플이 일기 앱에 주는 선물이다 — 운동·들은 음악·팟캐스트·
사진·중요 장소·연락처·마음 상태, 그리고 **iOS 18부터 서드파티 미디어(유튜브 포함)**.
Xcode의 Journaling Suggestions capability로 켠다. 그런데 **사용자가 피커에서 직접 골라야만**
내용이 넘어온다 — 「주인이 아무것도 하지 않아도 써 둔다」는 이 앱의 핵심 가치와 구조가
다르다. 자동 수집 후보가 아니라 **별도 흐름(「오늘 재료 더하기」)** 으로만 검토한다.
같은 이유로 공유 시트(Share Intent / Share Extension)도 수집이 아니라 입력이며, 화자가
사람 쪽으로 미끄러지는 위험이 있다(원칙 II).

---

## 6. 실측 · 문서 확인 · 미확인

### 이 저장소에서 실측된 것 (다시 재지 않는다)

- **배경 잡의 실제 간격**(019): 배터리 최적화 기본값에서 15분 등록이 **하루 1~2회**로
  억제된다(관측 간격 19시간 33분, 약 78배). **배터리 예외를 주면 10~32분**.
  → 8번 방법 B의 표본 수 근거. **065가 예외 요청 권한을 걷었으므로 이제 대부분의 기기는
  앞의 값(하루 1~2회) 쪽이다.**
- **앱이 전경에 있으면 배경 태스크가 아예 실행되지 않는다**(019·020).
- `expo-sensors`의 `getStepCountAsync`는 **iOS 전용**이다(AGENTS.md).
- `expo-media-library`는 `ACCESS_MEDIA_LOCATION` 조회 API를 주지 않는다 — 실제로
  불러 봐야 알고, 없으면 예외를 던진다.
- Android 14+의 부분 사진 허용(`limited`)이 실제로 온다.
- **재료가 많을수록 지어낸다**(측정 저장소 my-ollama): 캡션 상한 8→3이 사실 단정을
  60%→20%로 줄였다. → §7의 「프롬프트 투입 전 측정」 근거. **캡션 상한을 낮추자는 근거가
  아니다** — 상한은 8로 두기로 저장소 소유자가 정했다(2026-10-06, AGENTS 061). 여기서는
  「새 축을 프롬프트에 올리기 전에 잰다」의 근거로만 쓴다.
- **같은 손잡이가 모델마다 반대 부호로 작동한다**(my-ollama, 셀당 n=6이라 **미확정**).

### 문서로 확인한 것 (실측 아님 — 출처는 §9)

Play 정책(알림 접근 허용 사례 셋, 통화·SMS 제한, `QUERY_ALL_PACKAGES`,
`MANAGE_EXTERNAL_STORAGE`), Apple 문서(Screen Time 데이터가 확장을 벗어나지 못함,
`allowDeferredLocationUpdates` deprecated, JournalingSuggestions 엔타이틀먼트와
iOS 18 Generic Media), Expo 문서(`LocationTaskOptions`의 플랫폼 제약,
`expo-background-task`의 WorkManager/BGTaskScheduler 동작), Health Connect 권한 체계,
YouTube Data API의 시청 기록 제거, Google Fit API 종료.

### 아직 안 재 본 것 (스펙을 열면 먼저 잴 것)

1. **iOS 배경 잡 안에서 좌표가 오는가** — WhenInUse로는 오지 않고 Always가 필요할
   것으로 본다(짐작). 실기기 확인 필요.
2. **Health Connect 공급자가 없는 폰이 무엇을 돌려주는가** — 빈 값인지 예외인지.
   `none`/`unknown` 판정이 여기 달려 있다.
3. **좌표 한 점이 배경 잡 완주 시간에 주는 영향** — 일기 생성을 늦추면 안 된다.
4. **`getExif()`(사진마다 호출) 증가가 백그라운드에 주는 영향**(1번 축의 비싼 층).
   싼 층(`exeForMetadata()` 필드)은 호출이 늘지 않으므로 잴 필요가 없다.
5. SAF 하위 디렉터리 제약이 Download 폴더 실제 구조에서 얼마나 걸리는가.
6. **녹음·음원 파일의 `DATE_TAKEN`이 채워지는가**(6번 축) — 비어 있으면 `CREATION_TIME`
   질의가 0건을 돌려주고 그것은 `none`이 아니다. 삼성 음성 녹음 파일 하나로 잰다.
7. **헤드리스 잡에서 `listEvents()`가 도는가**(3번 축) — 런타임 권한 외에 막는 것이 없다고
   보지만 024의 `defineTask` 사고처럼 헤드리스만의 결함이 있을 수 있다.
8. **삼성 헬스가 Health Connect에 걸음을 실제로 적는가**(4번 축) — 기본값인지, 사용자가
   켜야 하는지. 한국 사용자의 공급자 대부분이 삼성 헬스다.

---

## 7. 축을 추가할 때 지킬 것 (공통)

1. **자리만 넓히고 세 갈래는 그대로** — `DaySignals`에 필드를 더한다. `SignalValue`의
   `known`/`none`/`unknown`을 넓히지 않는다(넓히면 002·003의 모든 판정이 영향받는다).
2. **`valueOr` 류를 만들지 않는다**(`types.ts` 불변식 3). 한계는 값에 붙인다
   (`complete` 패턴, FR-024·025).
3. **판정은 `collect.ts` 한 곳에서** — 권한 없음은 `unknown`이고 `none`이 아니다(FR-007),
   스스로 권한을 요청하지 않는다(FR-011), 어떤 경우에도 던지지 않는다(FR-012),
   하루 경계는 `dayBounds()`에서 받는다(FR-002).
4. **기기 통로는 `*-port.ts`로 주입한다** — 권한 조합을 대역으로 만든다(004 FR-017).
5. **권한은 021 통합 첫 실행 흐름에 추가한다** — 새 권한을 그 흐름 밖에서 따로 묻지 않는다.
6. **`USER_VISIBLE_SIGNAL_AXES`에 `false`로 먼저 넣는다** — 수집과 프롬프트 투입을 가르는
   자리가 이미 있다. 코드가 임계값으로 판정하지 않는다(FR-010).
7. **프롬프트 투입 전에 측정 저장소에서 한 세트 재고 올린다** — 근거는 §6의 재료 과다
   측정이다. 신호를 늘리는 것과 일기가 다채로워지는 것은 같은 일이 아니다.
8. **축이 비었을 때 프롬프트에서 사라지는가를 함께 정한다** — 정하지 않으면 프롬프트가
   「모르는 것의 목록」이 된다.
9. **백그라운드 경로도 눈으로 확인한다** — 029에서 배경 자동 생성이 사진을 한 장도 안
   보고 있던 사고가 있었다. 화면 경로만 보면 못 잡는다.
10. **실기기에서 최소 한 번 돌린다**(원칙 V). 건너뛴 실기기 테스트는 통과가 아니다.

---

## 8. 정정이 필요한 기존 기록

4번 축을 여는 스펙이 **함께** 고친다(이 문서는 고치지 않는다 — 코드 주석은 그 축을 여는
스펙과 같이 바뀌어야 근거가 붙는다).

| 자리 | 지금 | 정정 |
| --- | --- | --- |
| `AGENTS.md` 「안드로이드·Expo·기기」 | 「Android에는 기간 걸음 수를 되짚는 통로가 없다」 | `expo-sensors`에 한한 사실이다. **Health Connect는 `READ_STEPS`로 기간 걸음 수를 준다** — 조건은 공급자 유무·30일 한도·배경 읽기 권한이다 |
| `src/signals/types.ts` | `steps: false, // 안드로이드가 기간 걸음 수를 주지 않는다 — 영영 막혔다(FR-006)` | 같은 정정. 「영영」이 아니다 |

---

## 9. 출처

**Google Play / Android**
- [NotificationListenerService 레퍼런스](https://developer.android.com/reference/android/service/notification/NotificationListenerService)
- [Play Protect 개발자 가이드 — 알림 접근 허용 사례](https://developers.google.com/android/play-protect/warning-dev-guidance)
- [Health Connect: 데이터 읽기](https://developer.android.com/health-and-fitness/health-connect/read-data) · [시작하기](https://developer.android.com/health-and-fitness/health-connect/get-started)
- [Google Fit → Health Connect 마이그레이션 가이드](https://developer.android.com/health-and-fitness/health-connect/migration/fit) · [Fit API 종료 정리](https://sahha.ai/blog/google-fit-api-sunset-migration/)

**Apple**
- [Screen Time API 소개(WWDC21)](https://developer.apple.com/videos/play/wwdc2021/10123/) · [확장 밖으로 데이터가 나오지 못한다](https://dev.to/nikki_eke/what-no-one-tells-you-about-building-with-apples-screen-time-api-3o98)
- [WWDC24 — Enhanced suggestions for your journaling app](https://developer.apple.com/videos/play/wwdc2024/10209/) · [JournalingSuggestion.Song](https://developer.apple.com/documentation/journalingsuggestions/journalingsuggestion/song)
- [`allowDeferredLocationUpdates` deprecation](https://developer.apple.com/forums/thread/654296) · [Core Location Modern API Tips](https://twocentstudios.com/2024/12/02/core-location-modern-api-tips/)

**Expo**
- [expo-location — LocationTaskOptions·배경 위치 권한](https://docs.expo.dev/versions/latest/sdk/location/)
- [expo-background-task — WorkManager/BGTaskScheduler](https://docs.expo.dev/versions/latest/sdk/background-task/)
- [expo-file-system (legacy) — StorageAccessFramework](https://docs.expo.dev/versions/latest/sdk/filesystem-legacy/) · [SAF 하위 디렉터리 제약(expo/expo#20102)](https://github.com/expo/expo/issues/20102)
- [expo-media-library — granularPermissions·MediaType](https://docs.expo.dev/versions/latest/sdk/media-library/)
- [react-native-health-connect](https://www.npmjs.com/package/react-native-health-connect) · [expo-healthkit(양 플랫폼 단일 API)](https://github.com/saileshbro/expo-healthkit)

**YouTube**
- [YouTube Data API v3 revision history](https://developers.google.com/youtube/v3/revision_history) · [시청 기록 API가 없는 이유](https://bhanueso.dev/blips/youtube-watch-history-extension)

---

## 10. 교차 검증 (2026-10-07)

§3 권고 순서가 기대는 「신호를 어떻게 모으는가」를 **설치본·SDK 57 패키지 소스**와 대조했다.
실기기 실측은 아니다(원칙 V — 결과는 「문서·소스 확인」 칸이다).

| 대상 | 확인한 자리 | 핸드오프 원문 | 결과 |
| --- | --- | --- | --- |
| 1번 통로 | `node_modules/expo-media-library` 57.0.4 `build/types/AssetMetadata.d.ts`·`Asset.d.ts`, `src/signals/expo-port.ts` | `getAssetInfoAsync()`의 EXIF, `mediaSubtypes`(셀피·버스트) | **틀림.** 저장소는 새 API(`Query`·`Asset`)를 쓴다. `getMediaSubtypes()`는 iOS 전용이고 셀피·버스트 값이 없다. 싼 필드는 `exeForMetadata()`에 이미 들어 있다 → §2.2 #1 고침 |
| 1번 권한 | `app.json` `granularPermissions: ["photo"]`, 플러그인 `GRANULAR_PERMISSIONS_MAP` | 동영상 길이까지 권한 0 | **틀림.** Android 동영상은 `READ_MEDIA_VIDEO`가 필요하다 → 동영상을 6번으로 옮김 |
| 6번 날짜 칸 | `android/.../next/records/AssetField.kt`, 옛 `GetAssetsQuery.kt` | MediaStore `DATE_ADDED`로 센다 | **틀림.** 두 API 모두 `DATE_TAKEN`(생성)·`DATE_MODIFIED`(수정)로만 거른다. 음원의 `DATE_TAKEN`은 미확인(§6 #6) |
| 3번 통로 | `expo-calendar@57.0.5` `build/legacyWarnings.js`, `plugin/build/withCalendar.js`, Android `EventRepository.kt` | `getEventsAsync(start, end)`, 권한 1 | **고침.** 57에서 `getEventsAsync()`는 던진다 → `listEvents()`. 플러그인이 `WRITE_CALENDAR`도 넣는다 → 걷는다. 반복 일정은 `Instances` 질의라 펼쳐져 온다(원문의 우려 하나가 풀림) |
| 4번 배경 읽기 | context7 `/matinzd/react-native-health-connect` | `READ_HEALTH_DATA_IN_BACKGROUND` | **맞음.** `BackgroundAccessPermission`으로 요청·조회 |
| 4번 SDK | RN `libs.versions.toml` `minSdk = "24"`, 065 실측 targetSdk 36 | compileSdk/targetSdk 36, minSdk 26 요구 | targetSdk는 이미 충족, **minSdk 24→26이 실제 비용** |
| 7번 통로 | `expo-battery@57.0.3` `Battery.d.ts` | 배경 잡에서 샘플링 | 맞음 — 순간값 API뿐(`getPowerStateAsync`). 되짚기 없음 확인 |
| 8번 방법 B | `app.json` `blockedPermissions`, `plugins/with-battery-exception.js`(065) | 배터리 예외를 이미 받고 있다 → 10~32분 간격 | **065로 무너짐.** 대부분의 기기는 하루 1~2회 → §2.2 #8 고침 |

**순서에 대한 결론**: 바꾸지 않는다. 1·2의 앞자리 근거(권한·심사 0~1, 되짚힘)는 소스로
확인됐고, 5·6의 비용은 올라 뒷자리 근거가 강해졌다. 이름은 065를 따라 포켓로그로 고쳤다.
