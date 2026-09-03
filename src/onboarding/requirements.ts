/**
 * 앱이 요구하는 런타임 권한의 목록 — **사람이 못 박은 상수** (021).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/permission-requirements.md
 *       spec.md FR-001·FR-002·FR-003·FR-004, 원칙 V
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **코드가 항목을 더하거나 빼지 않는다**(원칙 V). 012의 `USER_VISIBLE_SIGNAL_AXES`가
 * 선례다 — 어느 축이 「통로가 없는가」를 값을 보고 정하면 그것이 임계값이고 원칙 IV로
 * 가는 길이다. 축마다 관측 가능 여부를 사람이 정해 상수로 못 박고, 통로가 생기면 그
 * 상수를 고친다.
 *
 * **안드로이드가 조회·요청 통로를 안 주는 축(기간 걸음 수 등)은 넣지 않는다**(FR-002).
 * 그런 축이 언제나 `unknown`인 것은 정상 상태다.
 *
 * **문안 규칙**(FR-007, SC-008): `rationale`·`ifDenied`에 모델 식별자·파라미터·양자화
 * 방식이 없다(원칙 III). 휴대폰이 관측하지 못하는 것을 단언하지 않는다(원칙 II) —
 * "사진을 보면 당신이 무엇을 했는지 압니다" ✗ / "사진 몇 장을 살펴 그날을 짐작해
 * 씁니다" ✓.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 권한 항목의 식별자. **정확히 4갈래**(contracts R2).
 *
 * - `photos` — `READ_MEDIA_IMAGES` (+`READ_MEDIA_VISUAL_USER_SELECTED`)
 * - `location` — `ACCESS_FINE_LOCATION` (장소명 지오코딩, T030 실측: 안드로이드도 권한 필요 → platforms ["android","ios"])
 * - `notifications` — `POST_NOTIFICATIONS` (Android 13+)
 * - `battery-exception` — `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` (권한 아님, 시스템 설정)
 *
 * **031 — `photo-location`(`ACCESS_MEDIA_LOCATION`)을 이 목록에서 뺐다.** `expo-media-library
 * 57`에 조회·요청 API가 없어(`expo-port.ts:95` 주석) 온보딩이 이 단계를 판정할 수 없었고,
 * 사진 granted 상태에서 상태가 늘 `"undetermined"`로만 나와 온보딩이 같은 단계를 무한
 * 반복했다(One UI 8.5 실기기). 이 권한은 `getLocation()` 호출 시 시스템이 사진 권한에
 * 종속해 처리하므로 별도로 물을 필요가 없다 — 실제 좌표 읽기 성공/실패는
 * `collect.ts`가 `places`에 기록한다(021 FR-013a). 매니페스트의 `ACCESS_MEDIA_LOCATION`
 * 선언은 유지된다(`app.json`). 조회 API가 생기면 이 상수에 항목을 다시 넣는다(원칙 V —
 * "축을 영구히 지우는 것이 아니다").
 */
export type PermissionKey = "photos" | "location" | "notifications" | "battery-exception";

export type PermissionRequirement = {
  key: PermissionKey;
  /** 온보딩 고정 순서상의 위치. 낮을수록 먼저. photos=1 … battery-exception=4 */
  order: number;
  /** 이 권한을 요구하는 기능 (근거, 원칙 V — 문서화). */
  neededBy: string;
  /**
   * 이 항목이 의미 있는 플랫폼. 현재 플랫폼이 없으면 온보딩에서 제시하지 않는다
   * (FR-003).
   */
  platforms: readonly ("android" | "ios")[];
  /** 온보딩·설정에 보일 "왜 필요한지" 문안 (원칙 II·III, SC-008). */
  rationale: string;
  /** 이 권한이 거부됐을 때 어떤 기능이 어떻게 제한되는지 (FR-014, 020 N8의 일반화). */
  ifDenied: string;
};

/**
 * 사람이 정한 목록. 코드가 항목을 더하거나 빼지 않는다 (FR-002·FR-004, 원칙 V).
 *
 * 새 권한이 필요해지면 이 상수에 사람이 항목을 더하고 `order`를 재배치한다.
 */
export const PERMISSION_REQUIREMENTS: readonly PermissionRequirement[] = [
  {
    key: "photos",
    order: 1,
    neededBy: "사진 수집(004) — 그날 찍힌 사진으로 하루를 짐작한다",
    platforms: ["android", "ios"],
    rationale: "그날 찍힌 사진 몇 장을 살펴 하루를 짐작해 씁니다.",
    ifDenied: "사진을 볼 수 없어, 일기는 사진 없이 쓰입니다.",
  },
  {
    key: "location",
    order: 2,
    // T030 실측 완료 (2026-08-29, SM-S901N/Galaxy S22, Android 16): 안드로이드에서도
    // `expo-location`의 `reverseGeocodeAsync`는 ACCESS_FINE_LOCATION이 있어야 지명을
    // 준다 — 권한을 거부하면 예외를 던지고(`geocoding-port.ts`가 삼켜 `unknown`),
    // 같은 좌표(37.5172,127.0473)가 권한 있을 때 "강남구", 없을 때 `placeName: unknown`
    // 으로 갈렸다. 따라서 platforms는 ["android","ios"] 유지 — 안드로이드에서도 이
    // 단계가 실제로 의미가 있다.
    neededBy: "장소명(017) — 좌표를 지명으로 옮긴다 (안드로이드·iOS 모두 권한 필요, T030 실측)",
    platforms: ["android", "ios"],
    rationale: "그날 머문 곳을 지명으로 적기 위해 위치를 씁니다.",
    ifDenied: "지명을 옮기지 못해, 장소는 좌표 없이 비워 둡니다.",
  },
  {
    key: "notifications",
    order: 3,
    neededBy: "완성 알림(020) — 자동으로 쓴 일기를 알린다",
    platforms: ["android", "ios"],
    rationale: "정한 시간대에 일기가 다 쓰이면 알려 드리기 위해 씁니다.",
    ifDenied: "일기가 완성돼도 바로 알려 드리지 못합니다.",
  },
  {
    key: "battery-exception",
    order: 4,
    neededBy: "백그라운드 자동 생성(019/020) — 절전 중에도 정한 시간대에 쓴다",
    platforms: ["android", "ios"],
    rationale: "기기가 절전에 들어가도 정한 시간대에 일기를 쓰도록 허용을 요청합니다.",
    ifDenied: "자동 생성이 정한 시간보다 많이 늦어질 수 있습니다.",
  },
] as const;
