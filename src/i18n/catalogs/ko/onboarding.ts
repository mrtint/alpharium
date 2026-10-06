/**
 * 한국어 카탈로그 — 권한 안내·온보딩 (062).
 *
 * 원래 자리: `src/onboarding/requirements.ts`의 `rationale`·`ifDenied`(021, 048에서 `ifDenied`는 해요체 — 홈 캡션·온보딩·설정이 같은 값을 본다),
 * `src/ui/OnboardingScreen.tsx`의 리터럴(021·029·043).
 *
 * 권한 목록의 키·순서·플랫폼은 `requirements.ts`에 그대로 있다 — 여기는 말만 둔다(K4). 모델 식별자 토큰을 담지 않는다(021, 원칙 III).
 */

type PermissionText = { rationale: string; ifDenied: string };

export const onboarding = {
  permissions: {
    photos: {
      rationale: "그날 찍힌 사진 몇 장을 살펴 하루를 짐작해 씁니다.",
      ifDenied: "사진을 볼 수 없어서 일기는 사진 없이 써요.",
    },
    location: {
      rationale: "그날 머문 곳을 지명으로 적기 위해 위치를 씁니다.",
      ifDenied: "지명을 옮기지 못해서 장소는 비워 둬요.",
    },
    notifications: {
      rationale: "정한 시간대에 일기가 다 쓰이면 알려 드리기 위해 씁니다.",
      ifDenied: "일기가 완성돼도 바로 알려 드리지 못해요.",
    },
    "battery-exception": {
      rationale: "기기가 절전에 들어가도 정한 시간대에 일기를 쓰도록 허용을 요청합니다.",
      ifDenied: "자동으로 쓰는 시간이 정한 때보다 많이 늦어질 수 있어요.",
    },
  } as {
    photos: PermissionText;
    location: PermissionText;
    notifications: PermissionText;
    "battery-exception": PermissionText;
  },

  title: "시작하기 전에",
  intro: "휴대폰이 하루를 일기로 쓰려면 몇 가지 허락이 필요해요. 원치 않으면 건너뛰어도 됩니다.",
  assetsBody: "일기를 쓰는 데 필요한 것을 내려받는 중입니다. 캐릭터 하나와 사진을 보는 도구예요.",
  assetsNoSkip: "이 단계는 건너뛸 수 없어요 — 없으면 일기를 쓸 수 없습니다.",
  assetsFailedSpace: "저장 공간이 부족해요. 공간을 확보한 뒤 다시 시도하세요.",
  assetsFailedNetwork: "네트워크가 불안정해요. 연결을 확인하고 다시 시도하세요.",
  assetsFailedOther: "내려받다 문제가 생겼어요. 다시 시도해 주세요.",
  retry: "다시 시도",
  download: "내려받기",
  downloading: "내려받는 중… 잠시만 기다려 주세요.",
  /** 권한 단계를 다 지났다 — 「준비가 끝났어요. 3/4단계를 확인했습니다.」 */
  done: (doneCount: number, total: number): string =>
    `준비가 끝났어요. ${doneCount}/${total}단계를 확인했습니다.`,
  start: "시작하기",
  openSettings: "설정 열기",
  allow: "허용",
  skip: "건너뛰기",
};
