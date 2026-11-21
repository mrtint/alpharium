# Contract: 자리 목록 → 일기 기록·저장, 바깥 전송·권한 0건

## 자리 목록 (`tracePlaces` 확장)

TV1. `tracePlaces(points)`는 `visits`를 함께 낸다(`PhotoPlaces.visits`). 묶기 규칙(직전 자리에서 `SAME_PLACE_METERS` 초과면 새 자리)은 그대로.
TV2. `visits[i].photoCount`의 합 = 좌표 있는 사진 수. `firstSeenAt ≤ lastSeenAt`. 시각순.
TV3. 좌표 0개면 `visits: []`.

## 파이프라인 4c

DP1. 설정 「켬」이고 `places`가 `known`이며 `visits`가 하나 이상이면 자리마다 이름을 찾는다. 「끔」이면 찾지 않는다.
DP2. 이름 찾기는 기기 밖으로 아무것도 보내지 않는다.
DP3. 이름 찾기가 던져도 일기 쓰기는 계속된다(`places`·판정 갈래 불변).
DP4. `request.places`(PromptPlaces)는 `buildPrompt()` 전에 실린다(017 L4와 같은 이유).
DP5. 저장 `entry.places`는 자리 전부를 시각순으로 담는다(data-model SavedPlace). 「끔」이면 이름 칸이 `null`.

## 프롬프트 (`src/diary/prompt.ts`만)

PL1. 항목 1개: `사진은 {때}에 {이름} 근처에서 찍혔어요.` / 이름 없음이면 `사진은 {때}에 이름을 모르는 곳에서 찍혔어요.`
PL2. 항목 2~3개: `사진은 {때}에 {이름} 근처, {때}에 {이름} 근처…에서 찍혔어요.`(마지막 항목 뒤에 「에서 찍혔어요.」)
PL3. `more > 0`: 다음 줄 `그 밖에 {N}곳에서도 찍혔어요.`(N은 기존 `koCount` 고유어 수 — 「두 곳」).
PL4. 때 낱말: dawn 새벽 · morning 아침 · daytime 낮 · evening 저녁 · night 밤.
PL5. `request.places`가 없으면 장소 이름 줄이 없다. 기존 자리 수·거리·`S_PLACES` 문장은 그대로.
PL6. 「다녀온 곳은」 문자열이 `prompt.ts`에 없다.
PL7. 장소 줄은 「갔다·머물렀다·있었다」를 사실로 쓰지 않는다(「찍혔어요」만).
PL8. 비 E2SN 경로는 같은 조각을 문장체(「찍혔다」)로 쓴다.

## 바깥 전송·권한 0건 (소스 계약 — 주석을 걷고 읽는다)

NX1. `src/`·`App.tsx`에 `expo-location`·`reverseGeocodeAsync`·`getForegroundPermissionsAsync`·`requestForegroundPermissionsAsync` 문자열이 없다.
NX2. `package.json` 의존성에 `expo-location`이 없고, `app.json` 플러그인에 없다.
NX3. `app.json` `android.blockedPermissions`에 `ACCESS_FINE_LOCATION`·`ACCESS_COARSE_LOCATION`·`ACCESS_BACKGROUND_LOCATION`이 있다.
NX4. `PERMISSION_REQUIREMENTS`의 키에 `location`이 없다.
NX5. `__tests__/privacy/outbound.ts`에 `place-name`이 없고 방침에 `data-outbound="place-name"`이 없다.
NX6. `app.json`(iOS `infoPlist`·플러그인 설정 포함)에 `NSLocation` 문구가 없다.

## 설정

ST1. 읽기 이전 규칙(data-model PlaceNamePreference). 기본 「켬」.
ST2. 대화상자 칸은 「켬」·「끔」 둘(`place-name-on`·`place-name-off`). `place-name-auto`가 없다.
ST3. 고지 문구는 좌표를 보낸다고 말하지 않는다.
