/**
 * 062 — 한국어 화면 문구가 이관 전과 바이트 동일하다 (contracts/i18n.md G1·G2, spec FR-020·SC-001).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **골든은 이관을 시작하기 전 커밋의 코드에서 만들었다**(tasks T004·T005). 이 파일을 고쳐 골든을 다시 쓰면 「이전」이 사라진다 —
 * `GOLDEN_WRITE=1`로 다시 쓰는 일은 문구를 일부러 바꿀 때만이다(그때는 이 기능의 「변화 0」이 깨진 것이므로 스펙을 먼저 고친다).
 *
 * - **G1** — 화면 문구 리터럴의 집합(중복 제거, `${…}`는 `${}`). 이관 뒤 `src/i18n/catalogs/ko/`에서 뽑은 집합이 골든과 같다.
 *   같은 글자를 두 자리가 따로 갖던 것을 카탈로그 항목 하나로 합치는 것은 문구 변화가 아니라서 집합으로 비교한다.
 * - **G2** — 문구를 만드는 함수·상수의 대표 입력 결과. 상수는 `JSON.stringify`로 키↔값 짝까지 본다(배선이 엇갈리는 것을 잡는다).
 *
 * **명시 차이** (G1 골든을 만들 때 대상에서 뺀 것):
 * - `src/app/failure-text.ts` — 죽은 코드(import하는 곳 0). 화면에 닿지 않아 골든 대상이 아니고 062에서 지운다(research R5).
 * - `src/onboarding/requirements.ts`의 `neededBy` 넷 — 화면에 안 보이는 문서용 필드라 062에서 주석으로 옮긴다.
 * - 새 진단 언어 줄(FR-011b)의 문구는 골든 뒤에 더한 것이라 `ADDED_AFTER_GOLDEN`으로만 허용한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { koLiterals, ROOT } from "./ko-literals";

import { failureLines, probeCells, storageValue } from "../../src/app/diagnostics-view";
import { DIAGNOSTICS_TEXT } from "../../src/app/diagnostics-text";
import { TOAST_TEXT } from "../../src/app/failure-toast";
import { SKIPPED_LINE, skippedLineText } from "../../src/app/skipped-line";
import { formatTargetHour, previewSentence, timeZoneLine } from "../../src/app/target-hour";
import type { DiaryListItem } from "../../src/app/state";
import { pickMonologue } from "../../src/diary/monologue";
import { PERMISSION_REQUIREMENTS } from "../../src/onboarding/requirements";
import { autoWriteDoneText } from "../../src/schedule/notification-text";
import { emptyDay, richDay } from "../../src/signals/fake";
import { DEVELOPER_TEXT } from "../../src/ui/developer-text";
import {
  CALENDAR_WEEKDAYS,
  DATE_JUMP,
  MATERIAL_TEXT,
  OVERWRITE_CONFIRM,
  WRITING_TEXT,
  WRITTEN_DAY_TEXT,
  calendarMonthText,
  calendarYearText,
  dayOfMonthText,
  dayStateText,
  monthText,
  weekdayLong,
  weekdayShort,
  writtenAtText,
} from "../../src/ui/home-text";
import { BACK_CHEVRON, SETTINGS_TEXT, wipeTitle } from "../../src/ui/settings-text";

const LITERALS_GOLDEN = join(__dirname, "ko-literals.golden.json");
const OUTPUTS_GOLDEN = join(__dirname, "ko-outputs.golden.json");
const WRITE = process.env.GOLDEN_WRITE === "1";

/**
 * G1 골든은 이관 전 화면 문구가 있던 스물두 파일(research R5 「화면 문구」 갈래 — `src/ui/home-text.ts`·`settings-text.ts`·
 * `developer-text.ts`, `src/app/diagnostics-text.ts`·`diagnostics-view.ts`·`failure-toast.ts`·`target-hour.ts`·`skipped-line.ts`,
 * `src/diary/monologue.ts`, `src/onboarding/requirements.ts`, `src/schedule/notification-text.ts`·`notification-port.ts`, 한글 리터럴이
 * 있던 `src/ui/*.tsx` 아홉, `App.tsx`)에서 뽑았다. 이관 뒤에는 그 문구가 전부 `src/i18n/catalogs/ko/`에 있어야 한다(T027) —
 * 카탈로그 밖에 남은 화면 문구는 `boundaries.test.ts`(B1)와 헌법 검사가 잡는다.
 *
 * 골든을 만들 때 뺀 것: `requirements.ts`의 `neededBy` 넷(화면에 안 보이는 문서용 필드 — 062에서 주석으로 옮겼다).
 */

/** 골든 뒤에 더한 문구 — 새 진단 언어 줄(FR-011b), 064 상태 흉내(`catalogs/ko/simulation.ts`), 067 사진 확대 화면(`catalogs/ko/photo-viewer.ts`), 068 iOS 배터리 행(`catalogs/ko/settings-platform.ts`), 074 모바일 데이터 동의·대기 화면(`catalogs/ko/consent-gate.ts`) */
const ADDED_AFTER_GOLDEN: readonly string[] = [
  // 108 — 홈 제약 띠(새 항목 `home.constraintBand`, 보드 밖 초안 — 소유자 확인 대기). 버튼 「설정 열기」는 골든에 이미 있다
  "사진 권한이 없어 사진 없이 써요",
  "권한 허용",
  "배터리 제한을 풀면 화면이 꺼져도 써 둬요",
  // 110 — 「최근 실패」의 옛 `photos`(「사진을 읽지 못함」)를 가른 두 갈래(`catalogs/ko/failures.ts`) — 소유자가 갈래를 가르자고 했다(2026-10-30)
  "하루의 신호를 가져오지 못함",
  "사진을 보지 못함",
  // 106 — 빠른 주기(개발 빌드 전용, `catalogs/ko/fast-cycle.ts`) — 보드 밖 초안, 소유자가 확정한다
  "${}분마다",
  "5~180 사이의 정수를 적어 주세요.",
  "「자동으로 쓰기」가 꺼져 있어서, 켜 두어도 쓰지 않아요.",
  "다음 주기 시작",
  "분",
  "빠른 주기",
  "빠른 주기 켜짐 · 주기 ${}분",
  "빠른 주기는 주기가 바뀔 때마다 오늘 일기를 지우고 다시 써요. 켜거나 주기를 바꾸면 지금 있는 오늘 일기도 지워져요.",
  "선택됨",
  "안드로이드는 잡 간격이 15분 아래로 줄지 않고 OS가 더 미룰 수 있어요. iPhone은 OS가 깨우는 때를 앱이 정하지 못해요. 시도 창(주기의 절반)과 알림 지연 상한은 사람이 정한 값이에요.",
  "오늘 일기를 지울까요?",
  "적용",
  "지금 쓰는 중이라 켜지 못했어요. 잠시 뒤에 다시 해 주세요.",
  "지금 주기",
  "지우고 켜기",
  "직접 입력 (5~180분)",
  // 101 — 설정 「정보」의 「오픈소스 라이선스」 행(새 영역 licenseLinks). 고지는 앱 밖 페이지라 모델 이름이 앱에 없다
  "오픈소스 라이선스",
  // 100 — 제목 구간 혼잣말 풀(`monologue.title`, 사람이 쓴 열 문장)
  "오늘의 제목을 고르는 중…",
  "이 하루에 어울리는 이름을 떠올리는 중…",
  "제목이 될 한 줄을 찾는 중…",
  "쓴 글에서 제목거리를 찾는 중…",
  "글에 이름표를 붙이는 중…",
  "오늘을 한마디로 말해 보는 중…",
  "제목이 될 말을 고르는 중…",
  "마지막으로 이름을 붙여 주는 중…",
  "어떤 이름이 어울릴지 생각하는 중…",
  "마무리 삼아 제목을 짓는 중…",
  "언어",
  "한국어",
  "상태 흉내",
  "오늘 날짜",
  "실패 토스트 보기",
  "쓸 재료 0으로 보기",
  "사진 권한 없음으로 보기",
  "상태 흉내가 켜져 있어서 일기를 쓰지 않아요. 개발자 화면에서 끌 수 있어요.",
  "끄기",
  "닫기",
  "사진 크게 보기",
  // 068 → 085 → 090 → 093 — iOS 배터리 행을 사실대로(값만 바뀜). 옛 값은 「저전력 모드를 끄면 제때 써요」(068)·「저전력 모드가 꺼져 있으면 먼저 써 둘 때가 있어요」(085)·「충전 중이고 저전력 모드가 꺼져 있으면 먼저 써 둘 때가 있어요」(090), 093이 알림을 눌러 시작하는 길(092)을 더했다 — 골든 밖 문구라 CHANGED_AFTER_GOLDEN이 아니라 여기서 바꿨다
  "충전 중이면 먼저 써 둬요. 아니면 알림을 눌러 시작해요",
  // 093 — iOS 전용 새 문구 둘(`catalogs/ko/settings-platform.ts`). 안드로이드 값(`targetHour.preview`)은 그대로라 CHANGED_AFTER_GOLDEN에 올리지 않는다
  "매일 ${}쯤 ${} 일기를 쓸 차례라고 알려요. 휴대폰에 따라 늦게 알릴 때가 있어요. 열면 바로 쓰고, 앱을 나가도 계속 써요. 이미 쓴 날은 건너뛰어요.",
  "앱을 나가도 계속 써요.",
  "Wi-Fi에서 다운로드하는 게 좋아요",
  "나중에 다운로드",
  "다시 확인하기",
  "모바일 데이터로 다운로드",
  "모바일 데이터로 연결돼 있어요",
  "아무것도 다운로드하지 않았어요. Wi-Fi에 연결한 뒤 다시 확인하면 다운로드할 수 있어요.",
  "일기를 쓰려면 AI 모듈을 다운로드해야 해요. 지금은 모바일 데이터라 데이터를 꽤 쓰게 돼요. Wi-Fi에서 다운로드하는 걸 권해요.",
  "일기를 쓰려면 AI 모듈을 다운로드해야 해요. 지금은 모바일 데이터라 약 ${}를 쓰게 돼요. Wi-Fi에서 다운로드하는 걸 권해요.",
  // 095 — 표준 동의 본문에 받을 양(App Store 4.2.3(ii)). 양을 못 읽을 때의 원래 문장은 골든 그대로다
  "일기를 쓰려면 사진을 읽는 AI 모듈과 글을 쓰는 AI 모듈을 약 ${} 다운로드해야 해요. 한 번만 다운로드하면 이후로는 필요 없어요.",
  // 083 — 설정 「정보」의 「서체 라이선스」 행·겹 화면(새 영역 `fontLicense`). 행과 제목은 같은 문자열이다
  "서체 라이선스",
  "이 앱의 글자는 Pretendard 서체로 그려요. 아래는 그 서체를 쓰도록 허락하는 라이선스 전문이에요.",
  // 081 — 「최근 실패」 묶음의 새 갈래 여섯(새 영역 `failures`)
  "지시문을 되뱉음",
  "다른 언어로 씀",
  "글을 끝맺지 못함",
  "시간 초과",
  "도중에 끊김",
  "생성 중 오류",
  // 078 → 109 — 진단·개발자 「날짜별 백그라운드」 묶음(새 영역 `attempts`). 109가 옛 「최근 자동 쓰기 시도」 줄의 경로·꼬리 문구를 걷고 요약 문구를 더했다
  "날짜별 백그라운드",
  "아직 기록이 없어요",
  "깨움 ${}번",
  "${}월 ${}일",
  "${} ${}",
  "시작한 뒤 끝나지 않음",
  "상태 흉내가 막음",
  "자동 쓰기 꺼짐",
  "쓰는 시각이 아님",
  "오늘 창 밖에서 이미 한 번 시도함",
  "모두 써 있음",
  "사진 권한 없음",
  "재료 없음",
  "고른 캐릭터 없음",
  "홈에 넘김",
  "다른 쓰기가 진행 중",
  // 080 — 시도 기록의 열넷째 갈래(합류한 홈의 그만두기·지우기가 끊은 쓰기)
  "사용자가 그만둠",
  // 090 — 시간 예산 만료 갈래
  "시간 예산이 끝남",
  // 085 — 쓸 차례 알림(새 영역 `reminder`)
  "${}${} ${}월 ${}일 일기를 쓸 차례예요",
  "일기 쓸 시각 알림",
  "알림이 꺼져 있어 쓸 차례를 알리지 못해요",
  "쓸 차례 알림 · ${}개 예약 · 다음 ${}월 ${}일 ${}시",
  "쓸 차례 알림 · 예약 없음",
  // 086 — 설정 「정보」의 방침·문의 행(새 영역 `policyLinks`)
  "개인정보처리방침",
  "도움말·문의",
  "브라우저를 열지 못했어요 · ${}",
  // 099 — 설정 「이 휴대폰」의 유실 안내 한 줄(새 영역 `lossNotice`)
  "앱을 지우거나 휴대폰을 바꾸면 일기가 사라질 수 있어요.",
  // 092 — iPhone 이어 쓰기의 시스템 진행 표시(새 영역 `continued`, 「준비하는 중」은 골든에 이미 있다)
  "${}${} ${}월 ${}일 일기를 쓰고 있어요",
  "사진을 보는 중",
  "글을 쓰는 중",
  // 098 — 홈 장소 값 줄의 접근성 라벨(새 항목 `home.material.placesA11y`)
  "사진이 찍힌 자리 ${}곳",
  // 105 — 개발자 메뉴 「쓰는 모듈」 행이 「쓰는 AI」로 바뀌었다. 「쓰는 모듈」은 설정 「이 휴대폰」에서도 「AI 모듈」로 바뀌어 한 문구가 둘로 갈라지므로 CHANGED_AFTER_GOLDEN이 아니라 여기서 더한다
  "쓰는 AI",
];

/**
 * 골든 뒤에 **값이 바뀐** 문구 (085부터).
 *
 * 골든 json은 다시 쓰지 않는다(「이전」이 사라진다). 대신 바뀐 것마다 스펙 번호·옛 값(`from`)·새 값(`to`)을 여기 적는다 —
 * 테스트는 골든에 `from`이 **있음을 먼저 단언**하고 `to`로 바꿔 비교한다(085 contracts GD1). 그래서 「바뀜」은 이 표에, 「이전」은 json에 남는다.
 */
type GoldenChange = {
  spec: string;
  literal?: { from: string; to: string };
  outputs?: readonly { key: string; path?: string; from: string; to: string }[];
};

const CHANGED_AFTER_GOLDEN: readonly GoldenChange[] = [
  // 106 — 「일기 모두 지우기」가 막혔을 때의 문구를 사실대로(080 잔여 ⑤, 소유자 확정 2026-10-26). 지우기는 남의 쓰기를 먼저 끊고 지우므로 「자동으로 쓰는
  // 중이라」는 사실과 다르다 — 막히는 경우는 다른 지우기가 겹치거나 끊은 쓰기가 끝나는 틈에 새 쓰기가 선 때뿐이다. 옛 값은 골든 json에 그대로 있다
  {
    spec: "106",
    literal: {
      from: "지금 자동으로 쓰는 중이라 지우지 못했어요.",
      to: "지금 다른 작업이 끝나는 중이라 지우지 못했어요. 잠시 뒤에 다시 해 주세요.",
    },
    outputs: [
      {
        key: "SETTINGS_TEXT",
        path: "wipeBlocked",
        from: "지금 자동으로 쓰는 중이라 지우지 못했어요.",
        to: "지금 다른 작업이 끝나는 중이라 지우지 못했어요. 잠시 뒤에 다시 해 주세요.",
      },
    ],
  },
  // 098 — 화면 문구를 사실대로(UX-13·15·16·20·21). 옛 값은 골든 json에 그대로 있다
  {
    spec: "098",
    literal: { from: "잠들기 전에 도착해요", to: "열면 바로 그날 일기를 써요" },
  },
  {
    spec: "098",
    literal: {
      from: "하루가 끝나갈 무렵, 오늘의 이야기가 조용히 완성돼 있어요.",
      to: "자동으로 쓰기를 켜 두면 쓸 차례에 알림이 오고, 먼저 써 두기도 해요.",
    },
  },
  {
    spec: "098",
    literal: {
      from: "위치 권한이 있으면 이름으로, 없으면 비워 둬요",
      to: "위치 권한이 있으면 이름을 참고하고, 없으면 비워 둬요",
    },
    outputs: [
      {
        key: "SETTINGS_TEXT",
        path: "placeAutoDesc",
        from: "위치 권한이 있으면 이름으로, 없으면 비워 둬요",
        to: "위치 권한이 있으면 이름을 참고하고, 없으면 비워 둬요",
      },
    ],
  },
  {
    spec: "098",
    literal: {
      from: "다닌 자리를 숫자 대신 이름으로 보여줘요",
      to: "일기를 쓸 때 다닌 자리의 이름을 참고해요",
    },
    outputs: [
      {
        key: "SETTINGS_TEXT",
        path: "placeOnDesc",
        from: "다닌 자리를 숫자 대신 이름으로 보여줘요",
        to: "일기를 쓸 때 다닌 자리의 이름을 참고해요",
      },
    ],
  },
  {
    spec: "098",
    literal: {
      from: "다 쓰면 지금 일기가 새 글로 바뀌어요.",
      to: "다 쓰면 지금 일기가 새 글로 바뀌어요. 바뀐 뒤에는 되돌릴 수 없어요.",
    },
    outputs: [
      {
        key: "OVERWRITE_CONFIRM",
        path: "body",
        from: "다 쓰면 지금 일기가 새 글로 바뀌어요.",
        to: "다 쓰면 지금 일기가 새 글로 바뀌어요. 바뀐 뒤에는 되돌릴 수 없어요.",
      },
    ],
  },
  {
    spec: "098",
    literal: {
      from: "되돌릴 수 없어요. 이름과 설정은 남아요.",
      to: "되돌릴 수 없어요. 휴대폰의 사진과 이름·설정은 남아요.",
    },
    outputs: [
      {
        key: "SETTINGS_TEXT",
        path: "wipeBody",
        from: "되돌릴 수 없어요. 이름과 설정은 남아요.",
        to: "되돌릴 수 없어요. 휴대폰의 사진과 이름·설정은 남아요.",
      },
    ],
  },
  {
    spec: "098",
    literal: { from: "쓰고 있다", to: "쓰고 있어요" },
    outputs: [{ key: "WRITING_TEXT", path: "fallback", from: "쓰고 있다", to: "쓰고 있어요" }],
  },
  {
    spec: "098",
    literal: { from: "일기 작성자를 준비해야 한다", to: "AI 모듈을 준비해야 해요" },
  },
  {
    spec: "085",
    literal: {
      from: "배터리 사용 · 제한 없음으로 두면 제때 써요",
      to: "제한 없음이면 열지 않아도 먼저 써 둘 때가 있어요",
    },
    outputs: [
      {
        key: "SETTINGS_TEXT",
        path: "permBatteryHint",
        from: "배터리 사용 · 제한 없음으로 두면 제때 써요",
        to: "제한 없음이면 열지 않아도 먼저 써 둘 때가 있어요",
      },
    ],
  },
  {
    spec: "085",
    literal: {
      from: "매일 ${}쯤 ${} 일기를 써요. 이미 쓴 날은 건너뛰어요.",
      to: "매일 ${}쯤 ${} 일기를 쓸 차례라고 알려요. 휴대폰에 따라 늦게 알릴 때가 있어요. 열면 바로 써요. 이미 쓴 날은 건너뛰어요.",
    },
    outputs: (
      [
        [0, "h12", "오전 12시", "어제"],
        [0, "h24", "0시", "어제"],
        [9, "h12", "오전 9시", "어제"],
        [9, "h24", "9시", "어제"],
        [12, "h12", "오후 12시", "그날"],
        [12, "h24", "12시", "그날"],
        [22, "h12", "오후 10시", "그날"],
        [22, "h24", "22시", "그날"],
      ] as const
    ).map(([h, f, hour, day]) => ({
      key: `previewSentence(${h},${f})`,
      from: `매일 ${hour}쯤 ${day} 일기를 써요. 이미 쓴 날은 건너뛰어요.`,
      to: `매일 ${hour}쯤 ${day} 일기를 쓸 차례라고 알려요. 휴대폰에 따라 늦게 알릴 때가 있어요. 열면 바로 써요. 이미 쓴 날은 건너뛰어요.`,
    })),
  },
  ...(
    [
      [
        "permission(notifications).rationale",
        "정한 시간대에 일기가 다 쓰이면 알려 드리기 위해 씁니다.",
        "쓸 차례와 다 쓴 일기를 알려 드리기 위해 씁니다.",
      ],
      [
        "permission(notifications).ifDenied",
        "일기가 완성돼도 바로 알려 드리지 못해요.",
        "쓸 차례도, 다 쓴 일기도 알려 드리지 못해요.",
      ],
      [
        "permission(battery-exception).rationale",
        "기기가 절전에 들어가도 정한 시간대에 일기를 쓰도록 허용을 요청합니다.",
        "휴대폰이 절전에 들어가도 열지 않아도 먼저 써 둘 수 있게 허용을 요청합니다.",
      ],
      [
        "permission(battery-exception).ifDenied",
        "자동으로 쓰는 시간이 정한 때보다 많이 늦어질 수 있어요.",
        "앱을 열 때까지 쓰지 못할 수 있어요.",
      ],
    ] as const
  ).map(([key, from, to]) => ({
    spec: "085",
    literal: { from, to },
    outputs: [{ key, from, to }],
  })),
  // 105 — 화면 문구 손질(말투·용어). 옛 값은 골든 json에 그대로 있다. 「다운로드」로 통일, 「모듈」은 「AI 모듈」, 사실과 다른 「밖으로 나가지 않아요」를 바로잡음
  {
    spec: "105",
    literal: {
      from: "${}${} 쓰고 있어요. 진행률은 세지 않아요.",
      to: "${}${} 쓰고 있어요. 시간이 다소 걸릴 수 있어요.",
    },
  },
  {
    spec: "105",
    literal: { from: "깨어났어요. 처음 뵙겠습니다.", to: "안녕하세요. 저는 누구일까요?" },
  },
  { spec: "105", literal: { from: "나중에 할래요", to: "나중에" } },
  { spec: "105", literal: { from: "내려받기", to: "다운로드" } },
  {
    spec: "105",
    literal: {
      from: "내려받는 중… 잠시만 기다려 주세요.",
      to: "다운로드 중… 잠시만 기다려 주세요.",
    },
  },
  {
    spec: "105",
    literal: {
      from: "내려받다 문제가 생겼어요. 다시 시도해 주세요.",
      to: "다운로드 중 문제가 생겼어요. 다시 시도해 주세요.",
    },
  },
  {
    spec: "105",
    literal: {
      from: "따로 적을 일이 없어요. 그날의 사진과 다닌 자리만으로 하루가 한 편 남습니다.",
      to: "AI가 그날의 사진으로 주인님의 하루를 정리해요.",
    },
  },
  { spec: "105", literal: { from: "모듈 다시 받기", to: "AI 모듈 다시 다운로드" } },
  { spec: "105", literal: { from: "모듈을 다시 받을까요?", to: "AI 모듈을 다시 다운로드할까요?" } },
  {
    spec: "105",
    literal: { from: "모바일 데이터로 ${}를 받아요.", to: "모바일 데이터로 ${}를 다운로드해요." },
  },
  { spec: "105", literal: { from: "받기", to: "다운로드" } },
  { spec: "105", literal: { from: "받는 중이에요", to: "다운로드 중이에요" } },
  { spec: "105", literal: { from: "받다가 멈췄어요", to: "다운로드 실패" } },
  { spec: "105", literal: { from: "받을 것이 있어요", to: "AI를 위한 다운로드가 필요해요" } },
  { spec: "105", literal: { from: "받을게요", to: "다운로드" } },
  {
    spec: "105",
    literal: {
      from: "빠진 모듈을 받아요. 이미 받은 것은 그대로 둬요.",
      to: "빠진 AI 모듈을 다운로드해요. 이미 다운로드한 것은 그대로 둬요.",
    },
  },
  {
    spec: "105",
    literal: {
      from: "사진도 위치도 밖으로 나가지 않아요. 전부 이 안에서만 일어나요.",
      to: "일기를 쓰는 일은 전부 이 휴대폰 안에서 해요.",
    },
  },
  {
    spec: "105",
    literal: { from: "휴대폰 안에서만 남아요", to: "사진과 일기는 휴대폰 밖으로 나가지 않아요" },
  },
  { spec: "105", literal: { from: "새로 온 친구가 깨어나는 중이에요.", to: "새 친구가 왔어요." } },
  { spec: "105", literal: { from: "쓰지 않아도 남는 하루", to: "포켓로그, 하루를 정리하는 AI" } },
  { spec: "105", literal: { from: "휴대폰 안에서만", to: "하루를 정리하는 AI" } },
  { spec: "105", literal: { from: "이 이름으로 할래요", to: "확정" } },
  { spec: "105", literal: { from: "이름을 입력하세요", to: "이름을 적어 주세요" } },
  {
    spec: "105",
    literal: {
      from: "이제부터 제가 주인님의 하루를 사진과 다닌 자리로 읽고, 일기로 적을게요. 모든 일은 이 휴대폰 안에서만 일어나요.",
      to: "이제부터 제가 주인님의 하루를 살펴보고, 일기로 적을게요. 잘 기록하도록 해볼게요.",
    },
  },
  {
    spec: "105",
    literal: {
      from: "일기를 쓰는 데 필요한 것을 내려받는 중입니다. 캐릭터 하나와 사진을 보는 도구예요.",
      to: "일기를 쓰는 데 필요한 것을 다운로드하는 중입니다. 캐릭터 하나와 사진을 보는 도구예요.",
    },
  },
  {
    spec: "105",
    literal: {
      from: "일기를 쓰려면 사진을 읽는 모델과 글을 쓰는 모델을 내려받아야 해요. 한 번만 받으면 이후로는 필요 없어요.",
      to: "일기를 쓰려면 사진을 읽는 AI 모듈과 글을 쓰는 AI 모듈을 다운로드해야 해요. 한 번만 다운로드하면 이후로는 필요 없어요.",
    },
  },
  { spec: "105", literal: { from: "읽는 모듈", to: "읽는 AI" } },
  { spec: "105", literal: { from: "쓰는 모듈", to: "AI 모듈" } },
  { spec: "105", literal: { from: "모듈", to: "AI 모듈" } },
  { spec: "105", literal: { from: "잠깐만요", to: "잠시만요" } },
  { spec: "105", literal: { from: "제 이름을 지어주세요.", to: "제 이름을 지어 주실래요?" } },
  {
    spec: "105",
    literal: {
      from: "친구를 깨우지 못했어요. 잠시 후 다시 시도해 주세요.",
      to: "잠시 후 다시 시도해 주세요.",
    },
  },
  {
    spec: "105",
    outputs: [
      { key: "DEVELOPER_TEXT", path: "groupModules", from: "모듈", to: "AI 모듈" },
      { key: "SETTINGS_TEXT", path: "deviceModules", from: "쓰는 모듈", to: "AI 모듈" },
      { key: "DEVELOPER_TEXT", path: "readModule", from: "읽는 모듈", to: "읽는 AI" },
      { key: "DEVELOPER_TEXT", path: "writeModule", from: "쓰는 모듈", to: "쓰는 AI" },
      {
        key: "DEVELOPER_TEXT",
        path: "redownload",
        from: "모듈 다시 받기",
        to: "AI 모듈 다시 다운로드",
      },
      {
        key: "DEVELOPER_TEXT",
        path: "redownloadTitle",
        from: "모듈을 다시 받을까요?",
        to: "AI 모듈을 다시 다운로드할까요?",
      },
      {
        key: "DEVELOPER_TEXT",
        path: "redownloadBody",
        from: "빠진 모듈을 받아요. 이미 받은 것은 그대로 둬요.",
        to: "빠진 AI 모듈을 다운로드해요. 이미 다운로드한 것은 그대로 둬요.",
      },
      { key: "DEVELOPER_TEXT", path: "redownloadConfirm", from: "받기", to: "다운로드" },
      {
        key: "SETTINGS_TEXT",
        path: "redownload",
        from: "모듈 다시 받기",
        to: "AI 모듈 다시 다운로드",
      },
      {
        key: "WRITING_TEXT.byline(금동이)",
        from: "금동이가 쓰고 있어요. 진행률은 세지 않아요.",
        to: "금동이가 쓰고 있어요. 시간이 다소 걸릴 수 있어요.",
      },
      {
        key: "WRITING_TEXT.byline(뽀삐)",
        from: "뽀삐가 쓰고 있어요. 진행률은 세지 않아요.",
        to: "뽀삐가 쓰고 있어요. 시간이 다소 걸릴 수 있어요.",
      },
      {
        key: "WRITING_TEXT.byline(Momo)",
        from: "Momo가 쓰고 있어요. 진행률은 세지 않아요.",
        to: "Momo가 쓰고 있어요. 시간이 다소 걸릴 수 있어요.",
      },
      {
        key: "DEVELOPER_TEXT.redownloadCellular(2.0GB)",
        from: "모바일 데이터로 2.0GB를 받아요.",
        to: "모바일 데이터로 2.0GB를 다운로드해요.",
      },
    ],
  },
];

/** 골든 리터럴 집합에 바뀐 값을 얹는다 — `from`이 골든에 없으면 실패한다(V10) */
function changedLiterals(golden: readonly string[]): string[] {
  const set = new Set(golden);
  for (const change of CHANGED_AFTER_GOLDEN) {
    if (change.literal === undefined) continue;
    expect({ spec: change.spec, inGolden: set.has(change.literal.from) }).toEqual({
      spec: change.spec,
      inGolden: true,
    });
    set.delete(change.literal.from);
    set.add(change.literal.to);
  }
  return [...set].sort();
}

/** 골든 출력에 바뀐 값을 얹는다 — 그 자리가 `from`이 아니면 실패한다(V10) */
function changedOutputs(golden: Record<string, string>): Record<string, string> {
  const out = { ...golden };
  for (const change of CHANGED_AFTER_GOLDEN) {
    for (const o of change.outputs ?? []) {
      if (o.path === undefined) {
        expect({ key: o.key, value: out[o.key] }).toEqual({ key: o.key, value: o.from });
        out[o.key] = o.to;
      } else {
        const parsed = JSON.parse(out[o.key]) as Record<string, unknown>;
        expect({ key: o.key, path: o.path, value: parsed[o.path] }).toEqual({
          key: o.key,
          path: o.path,
          value: o.from,
        });
        parsed[o.path] = o.to;
        out[o.key] = JSON.stringify(parsed);
      }
    }
  }
  return out;
}

/** 한국어 카탈로그 파일 전부 */
function catalogFiles(): string[] {
  const dir = "src/i18n/catalogs/ko";
  return readdirSync(join(ROOT, dir))
    .filter((f) => f.endsWith(".ts"))
    .map((f) => `${dir}/${f}`);
}

function currentLiterals(): string[] {
  const set = new Set(koLiterals(catalogFiles()));
  for (const x of ADDED_AFTER_GOLDEN) set.delete(x);
  return [...set].sort();
}

const item = (over: Partial<DiaryListItem>): DiaryListItem => ({
  day: "2026-09-13",
  readable: true,
  photos: { kind: "unknown" } as DiaryListItem["photos"],
  ...over,
});

/** 단계·갈래마다 후보를 순서대로 전부 꺼낸다 — `random`을 0..1로 쓸어 인덱스를 하나씩 고른다 */
function monologueCandidates(
  stage: Parameters<typeof pickMonologue>[0],
  branch: Parameters<typeof pickMonologue>[1],
): string[] {
  const seen: string[] = [];
  for (let k = 0; k < 200; k += 1) {
    const line = pickMonologue(stage, branch, undefined, undefined, () => (k + 0.5) / 200);
    if (!seen.includes(line)) seen.push(line);
  }
  return seen;
}

function outputs(): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (label: string, value: unknown) => {
    out[label] = typeof value === "string" ? value : JSON.stringify(value);
  };

  // ── 홈 ──
  for (let d = 0; d < 7; d += 1) {
    put(`weekdayLong(${d})`, weekdayLong(d));
    put(`weekdayShort(${d})`, weekdayShort(d));
  }
  put("monthText(2026-08-31)", monthText("2026-08-31"));
  put("dayOfMonthText(2026-08-05)", dayOfMonthText("2026-08-05"));
  put("dayStateText(undefined, today)", dayStateText(undefined, true));
  put("dayStateText(undefined, past)", dayStateText(undefined, false));
  put("dayStateText(unreadable)", dayStateText(item({ readable: false }), false));
  put("dayStateText(title)", dayStateText(item({ title: "비 오는 날" }), false));
  put("dayStateText(no title)", dayStateText(item({}), true));
  put("calendarMonthText(9)", calendarMonthText({ year: 2026, month: 9 } as never));
  put("calendarYearText(2026)", calendarYearText(2026));
  put("CALENDAR_WEEKDAYS", CALENDAR_WEEKDAYS);
  put("OVERWRITE_CONFIRM", OVERWRITE_CONFIRM);
  put("DATE_JUMP", DATE_JUMP);
  put("WRITTEN_DAY_TEXT", WRITTEN_DAY_TEXT);
  put("WRITING_TEXT", WRITING_TEXT);
  put("WRITING_TEXT.byline(금동이)", WRITING_TEXT.byline("금동이"));
  put("WRITING_TEXT.byline(뽀삐)", WRITING_TEXT.byline("뽀삐"));
  put("WRITING_TEXT.byline(Momo)", WRITING_TEXT.byline("Momo"));
  put("MATERIAL_TEXT", MATERIAL_TEXT);
  const now = new Date(2026, 9, 6, 15, 0, 0);
  for (const minutes of [0, 0.5, 5, 59, 60, 135]) {
    put(
      `writtenAtText(-${minutes}m)`,
      writtenAtText(new Date(now.getTime() - minutes * 60_000), now),
    );
  }
  put("writtenAtText(future)", writtenAtText(new Date(now.getTime() + 60_000), now));
  put("TOAST_TEXT", TOAST_TEXT);

  // ── 설정 ──
  put("SETTINGS_TEXT", SETTINGS_TEXT);
  put("wipeTitle(3)", wipeTitle(3));
  put("BACK_CHEVRON", BACK_CHEVRON);
  for (const h of [0, 9, 12, 22]) {
    for (const f of ["h12", "h24"] as const) {
      put(`formatTargetHour(${h},${f})`, formatTargetHour(h, f));
      put(`previewSentence(${h},${f})`, previewSentence(h, f));
    }
  }
  put("timeZoneLine(Seoul)", timeZoneLine("Asia/Seoul", 540));
  put("timeZoneLine(Paris)", timeZoneLine("Europe/Paris", 120));
  put("timeZoneLine(New_York)", timeZoneLine("America/New_York", -240));
  put("timeZoneLine(Kolkata)", timeZoneLine("Asia/Kolkata", 330));
  put("timeZoneLine(null)", timeZoneLine(null, 0));
  put("SKIPPED_LINE", SKIPPED_LINE);
  put("skippedLineText(yesterday)", skippedLineText("2026-10-05", now));
  put("skippedLineText(other)", skippedLineText("2026-09-11", now));

  // ── 알림 ──
  put("autoWriteDoneText(금동이)", autoWriteDoneText("금동이", "2026-10-01"));
  put("autoWriteDoneText(뽀삐)", autoWriteDoneText("뽀삐", "2026-09-30"));
  put("autoWriteDoneText(Momo)", autoWriteDoneText("Momo", "2026-01-05"));

  // ── 혼잣말 ──
  for (const [stage, branch] of [
    ["signals", undefined],
    ["vision", "normal"],
    ["vision", "many"],
    ["load", "cold"],
    ["load", "hot"],
    ["generation", undefined],
  ] as const) {
    put(`monologue(${stage},${branch})`, monologueCandidates(stage, branch as never));
  }

  // ── 온보딩 권한 ──
  for (const r of PERMISSION_REQUIREMENTS) {
    put(`permission(${r.key}).rationale`, r.rationale);
    put(`permission(${r.key}).ifDenied`, r.ifDenied);
  }

  // ── 개발자·진단 ──
  put("DEVELOPER_TEXT", DEVELOPER_TEXT);
  put("DEVELOPER_TEXT.redownloadCellular(2.0GB)", DEVELOPER_TEXT.redownloadCellular("2.0GB"));
  put("DIAGNOSTICS_TEXT", DIAGNOSTICS_TEXT);
  put("DIAGNOSTICS_TEXT.storageOk(11)", DIAGNOSTICS_TEXT.storageOk(11));
  put("DIAGNOSTICS_TEXT.storageBad(13,1)", DIAGNOSTICS_TEXT.storageBad(13, 1));
  put("DIAGNOSTICS_TEXT.previewFailed(x)", DIAGNOSTICS_TEXT.previewFailed("x"));
  put("storageValue(ok)", storageValue({ kind: "done", total: 11, unreadable: 0 }));
  put("storageValue(bad)", storageValue({ kind: "done", total: 13, unreadable: 1 }));
  put("probeCells(rich)", probeCells(richDay("2026-10-05")));
  put("probeCells(empty)", probeCells(emptyDay("2026-10-05")));
  put(
    "failureLines",
    failureLines([
      { reason: "module", at: new Date(2026, 9, 6, 9, 5) },
      { reason: "photos", at: new Date(2026, 9, 6, 9, 5) },
      { reason: "empty", at: new Date(2026, 9, 6, 9, 5) },
      { reason: "save", at: new Date(2026, 9, 6, 9, 5) },
      { reason: "unwritten", at: new Date(2026, 0, 2, 23, 59) },
    ]),
  );
  return out;
}

describe("062 G1 — 화면 문구 리터럴 집합이 이관 전과 같다", () => {
  it("골든과 같다", () => {
    const now = currentLiterals();
    if (WRITE) writeFileSync(LITERALS_GOLDEN, JSON.stringify(now, null, 2) + "\n");
    const golden = JSON.parse(readFileSync(LITERALS_GOLDEN, "utf8")) as string[];
    expect(now).toEqual(changedLiterals(golden));
  });
});

describe("062 G2 — 문구 함수·상수의 출력이 이관 전과 바이트 동일하다", () => {
  it("골든과 같다", () => {
    const now = outputs();
    if (WRITE) writeFileSync(OUTPUTS_GOLDEN, JSON.stringify(now, null, 2) + "\n");
    const golden = JSON.parse(readFileSync(OUTPUTS_GOLDEN, "utf8")) as Record<string, string>;
    expect(now).toEqual(changedOutputs(golden));
  });
});
