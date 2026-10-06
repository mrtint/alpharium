# 신호 확장 타당성 — 핸드오프

**작성**: 2026-10-06
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
   기록 계층이 필요하고, Play 배경 위치 심사가 붙는다. 되돌릴 수 없는 비용은 결론이
   난 뒤에 쓴다.

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
| 1 | 사진 메타 해상도 | 해상도 | ✅ | ✅ | ✅ | **0** | 없음 | 쉬움 | 중간 | 낮음 | 낮음 |
| 2 | 앱 자신의 흔적 | 새 축 | ✅ | ✅ | ✅ | **0** | 없음 | 쉬움 | 작음 | 낮음 | 낮음 |
| 3 | 캘린더 | 새 축 | ✅ | ✅ | ✅ | 1 | 없음 | 쉬움 | **큼** | 중간 | 중간 |
| 4 | 걸음·수면·운동 | 새 축 | ✅ | ✅ | ⚠️ | 1~3 | **Android 선언서** | 보통 | 중간 | 높음 | 낮음 |
| 5 | 활동 종류(걷기/차/정지) | 새 축 | ✅ iOS만 | ✅ | ❌ | 1 | 없음 | 어려움 | 중간 | 낮음 | 낮음 |
| 6 | 당일 음원·녹음·영상 | 새 축 | ✅ | ❌ | ✅ | 1 | 없음 | 쉬움 | 중간 | 중간 | 낮음 |
| 7 | 배터리·연결 | 되살림 | ❌ | ⚠️ | ✅ | 0 | 없음 | 어려움 | 작음 | 낮음 | 낮음 |
| 8 | **긴 주기 위치** | 새 축 | ❌ | ⚠️ | ✅ | 1 | **Play 선언서+영상** | 어려움 | **큼** | 낮음 | **높음** |
| 9 | 당일 다운로드 파일 | 새 축 | ✅ | ❌ | ⚠️ | 폴더 선택 | 없음 | 보통 | 작음 | 높음 | 중간 |

**보류**(결정이 필요하다, §5): 날씨 · iOS JournalingSuggestions
**제외**(§4): 알림 · 통화 이력 · SMS · 앱 사용 시간 · 유튜브/유튜브 뮤직 · 구글 계정 활동 · 음악 재생 이력 · 모든 파일 접근 · 접근성 서비스 · iOS 스크린타임

### 2.2 후보별 상세와 구현 참고

#### 1. 사진 메타 해상도 — 권한 0

**무엇을 얻는가**: 같은 「사진 5장」을 여러 하루로 가른다. 스크린샷만 열두 장인 하루,
셀피 한 장뿐인 하루, 23시에 몰린 사진, 3분짜리 동영상.

**통로**: 이미 쓰는 `expo-media-library`. `getAssetInfoAsync()`의 EXIF,
`mediaSubtypes`(셀피·버스트), 동영상 길이, 촬영 시각 분포. `folderName`
(Camera/Screenshots)은 **023에서 이미 수집 중**이고 `src/vision/select.ts`가 쓴다.

**구현 참고**:
- `PhotoObservation.complete`가 이미 상한을 값에 붙이고 있다 — 새 필드도 같은 규칙을
  따른다(목록만 꺼내는 편의 함수 금지, `types.ts` FR-027).
- `getAssetInfoAsync()`는 **사진마다 호출**이다. 023 선별 알고리즘과 호출 수가 겹치는지
  먼저 센다 — 백그라운드 완주 시간에 영향이 갈 수 있다.
- EXIF는 기기·앱마다 필드가 다르다. 없는 필드를 0으로 채우지 않는다(원칙 V).

#### 2. 앱 자신의 흔적 — 권한 0

**무엇을 얻는가**: 어제 앱을 몇 번 열었나, 어제 일기를 읽었나, 며칠 연속 썼나.

**통로**: 알파리움이 직접 적는다. 외부 API가 없다.

**구현 참고**:
- **화자 문제가 있다.** 「주인이 나(휴대폰)를 몇 번 열었다」는 원칙 II의 시야에 맞지만,
  일기가 자기 앱 이야기만 하게 되면 재료가 아니라 잡음이다. 프롬프트 투입 전 측정이
  특히 필요한 축이다.
- 기록 자리는 `preferences/`(020 `notified.json` 관례)이지 `DiaryEntry`가 아니다.

#### 3. 캘린더 — 권고 2순위

**무엇을 얻는가**: 사진이 없어도 「어제 14시에 무엇을 했나」를 아는 **유일하게 되짚히는
통로**. 사진 없는 하루를 구제한다.

**통로**: `expo-calendar` `getEventsAsync(start, end)`. iOS는 미리 알림도 읽는다
(iOS 전용 API).

**구현 참고**:
- iOS 17+는 전체 접근 권한 문구가 따로 필요하다(`NSCalendarsFullAccessUsageDescription`).
  Android는 `READ_CALENDAR`.
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
- **배경 읽기 권한이 따로 있다**: `READ_HEALTH_DATA_IN_BACKGROUND`. 알파리움은 배경
  자동 생성이 기본이라 이것 없이는 자동 생성 경로에서 값이 안 온다.
- 기본 30일 한도(어제를 쓰는 데는 무관). 더 과거는 `READ_HEALTH_DATA_HISTORY`.
- `expo-build-properties`로 compileSdk/targetSdk 36, minSdk 26이 요구된다.
- Play 콘솔 health 데이터 선언 + 개인정보처리방침.

#### 5. 활동 종류(걷기/차/정지) — iOS가 더 쉬운 드문 축

**통로**: iOS `CMMotionActivityManager.queryActivityStarting(from:to:)`이 **최근 7일을
되짚는다**(Motion & Fitness 권한). Expo가 노출하지 않아 작은 네이티브 모듈이 필요하다.
Android는 실시간 구독뿐이라 기록 계층이 필요하고, 사실상 4번(운동 세션)으로 합류한다.

**구현 참고**: prebuild + 자체 config plugin 셋(`plugins/with-*.js`)이 이미 있으므로
네이티브 모듈 추가에 구조적 장벽은 없다. iOS 전용 축이 하나 늘어난다는 점이 비용이다.

#### 6. 당일 음원·녹음·영상 — Android 전용, 비용 낮음

**무엇을 얻는가**: 어제 녹음한 파일, 어제 받은 음악, 어제 찍은 영상. 녹음 파일은 단서로
강하다(회의·연주·메모).

**통로**: 이미 쓰는 `expo-media-library`에 `granularPermissions: ["photo", "audio", "video"]`
를 더하고 MediaStore의 `DATE_ADDED`로 그날 추가된 것을 센다.

**구현 참고**:
- app.json의 `expo-media-library` 플러그인 옵션과 `android.permissions`를 함께 고친다
  (`READ_MEDIA_AUDIO`, `READ_MEDIA_VIDEO`).
- iOS는 오디오 자산이 없다 — `unknown`이 아니라 「이 플랫폼이 제공하지 않음」 사유로
  내린다(`SignalValue.unknown.reason`의 기존 관례).
- **내용은 읽지 않는다.** 파일 이름·개수·시각까지다. 녹음을 듣는 축을 열면 다른 제품이다.

#### 7. 배터리·연결 — 이미 자리가 있는 축

`DaySignals.battery`·`connectivity`와 타입이 이미 있고 `USER_VISIBLE_SIGNAL_AXES`에서
`false`다(「기록 계층이 없다 — 생기면 되살린다」). 기록 계층이 생기면 **8번과 함께 공짜로
살아난다** — 둘을 따로 열지 않는다.

**구현 참고**: `expo-battery`·`expo-network`를 배경 잡에서 샘플링한다. iOS는 배경 실행이
기회성이라 「충전했는가」가 짐작 수준이다 — 그 사실을 값에 붙인다.

#### 8. 긴 주기 위치 — 값이 가장 크고 가장 비싸다

**무엇을 얻는가**: 사진 밖의 자리. `PlaceTrace`를 사진을 안 찍은 하루에도 채운다.

**세 가지 방법**:

| 방법 | 내용 | 평가 |
| --- | --- | --- |
| A. 배경 위치 세션 | `Location.startLocationUpdatesAsync`. `timeInterval`은 **Android 전용**, Android는 `foregroundService` 필수(상시 알림) | iOS는 「30분마다」를 말할 수 없다 — 거리·사건 기반이 된다 |
| **B. 15분 배경 잡에 좌표 한 점** | 이미 있는 `AUTO_DIARY_TASK` 콜백에서 `getCurrentPositionAsync()` 한 번 | **권고.** 새 서비스·상시 알림 없음. 019 실측으로 간격을 이미 안다(§6) |
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
- 배터리 최적화 예외는 `plugins/with-battery-exception.js`로 **이미 받고 있다**.

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
| **1** | 사진 메타 해상도 | 권한 0·심사 0·되짚힘·양쪽 대칭. 다양성 대비 비용이 가장 낮다 |
| **2** | 캘린더 | **새로 생기는 유일한 보편 축**이고 사진 없는 하루를 구제한다. 비용은 권한 1개 |
| **3** | 앱 자신의 흔적 | 권한 0이지만 가치가 작고 화자 문제가 있다. 1·2의 빈자리를 메우는 용도 |
| **4** | 걸음·수면·운동 | 가치는 중간, iOS는 쉽다. Android의 공급자 의존과 선언서가 발목이다 |
| **5** | 당일 음원·녹음·영상 | 비용이 낮고(이미 쓰는 라이브러리) 단서가 구체적이다. Android 전용이 감점 |
| **6** | **긴 주기 위치 + 배터리·연결**(한 묶음) | **가치는 2번과 맞먹지만 값이 가장 비싸다.** 기록 계층 한 번으로 세 축이 살아나므로 반드시 묶어 연다. 되돌릴 수 없는 비용(심사·신뢰)이 있어 뒤에 둔다 |
| **7** | iOS 활동 종류 | 되짚히고 깔끔하지만 iOS 전용 + 네이티브 모듈. 비대칭을 감수할 이유가 생긴 뒤에 |
| **8** | 당일 다운로드 파일 | 가치가 가장 작고 사용자 마찰이 있다 |

**묶음 규칙**: 6번은 쪼개지 않는다. 기록 계층(배경 샘플링 + 저장)이 위치·배터리·연결의
공통 선행 의존이므로, 따로 열면 같은 계층을 두 번 만든다.

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
  → 8번 방법 B의 표본 수 근거.
- **앱이 전경에 있으면 배경 태스크가 아예 실행되지 않는다**(019·020).
- `expo-sensors`의 `getStepCountAsync`는 **iOS 전용**이다(AGENTS.md).
- `expo-media-library`는 `ACCESS_MEDIA_LOCATION` 조회 API를 주지 않는다 — 실제로
  불러 봐야 알고, 없으면 예외를 던진다.
- Android 14+의 부분 사진 허용(`limited`)이 실제로 온다.
- **재료가 많을수록 지어낸다**(측정 저장소 my-ollama): 캡션 상한 8→3이 사실 단정을
  60%→20%로 줄였다. → §7의 「프롬프트 투입 전 측정」 근거.
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
4. **`getAssetInfoAsync()` 호출 수 증가가 백그라운드에 주는 영향**(1번 축).
5. SAF 하위 디렉터리 제약이 Download 폴더 실제 구조에서 얼마나 걸리는가.

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
