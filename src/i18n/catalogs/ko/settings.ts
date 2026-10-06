/**
 * 한국어 카탈로그 — 설정 (062).
 *
 * 원래 자리: `src/ui/settings-text.ts`(055~058 — 보드 「KO 문자열 — 설정 · 개발자 (6c–6l)」 표 원문, 키 이름은 보드 키),
 * `src/app/skipped-line.ts`(057 보드 `perm.photos.skipped*`), `src/app/target-hour.ts`의 문장 틀(056 보드 `time.*`·`settings.autoWriteTime.*`),
 * `App.tsx`의 「설정을 읽는 중…」.
 *
 * **보드 밖 문구**(원래 자리의 주석 그대로): `save`·`backToSettings`·`redownload`(055 Clarification), `placeNotice`(017 FR-006을 해요체로),
 * `wipeBlocked`(058 research R10).
 *
 * **판정하지 않는다**(K4) — 오전/오후·12시간 칸·「어제」인가는 `target-hour.ts`·`skipped-line.ts`가 정해 인자로 준다.
 * 「쯤」을 늘 붙인다(020 FR-002 — 정확한 시각을 약속하지 않는다).
 */

/** 사진 행의 건너뜀 보조 줄 (057, 보드 `6g`). `{M}`·`{d}`는 `skippedLineText()`가 채운다 */
export const skippedLine = {
  yesterday: "어제 자동 쓰기를 건너뛰었어요",
  on: "{M}월 {d}일 자동 쓰기를 건너뛰었어요",
};

export const settings = {
  title: "설정",
  /** 앞에 ‹ 를 따로 그린다 */
  back: "일기",
  groupCharacter: "캐릭터",
  name: "이름",
  groupDiary: "일기",
  autoWrite: "자동으로 쓰기",
  groupPerm: "권한 · 휴대폰 설정으로 이동",
  permPhotos: "사진",
  permLocation: "위치",
  permNotif: "알림",
  permBattery: "배터리",
  permBatteryHint: "배터리 사용 · 제한 없음으로 두면 제때 써요",
  permAllowed: "허용됨",
  permPartial: "일부 허용",
  permDenied: "허용 안 함",
  groupAbout: "정보",
  version: "버전",
  /** 059 — 「정보」 맨 아래 개발자 행(보드 `about.developer`) */
  developer: "개발자",
  /** 진입점 점 세 개의 스크린리더 라벨(보드 `6a`) */
  entryLabel: "설정",
  /** 이름 바꾸기의 확정 버튼 */
  save: "저장",
  /** 설정 위에 쌓인 화면의 뒤로 — 앞에 ‹ 를 따로 그린다 */
  backToSettings: "설정",
  /** 쓰기 시작 전 「작성자를 준비해야 한다」 안내의 버튼 */
  redownload: "모듈 다시 받기",
  /** 개발자 겹의 제목(보드 `dev.title`) */
  developerTitle: "개발자",
  /* ── 056 — 매일 쓰는 시각·장소 이름 (보드 `6c` ③·`6f`·`6l`) ── */
  autoWriteTime: "매일 쓰는 시각",
  placeNames: "장소 이름으로 보기",
  timeTitle: "매일 쓰는 시각",
  timeAm: "오전",
  timePm: "오후",
  timeCancel: "취소",
  placeTitle: "장소 이름으로 보기",
  placeAuto: "자동",
  placeAutoDesc: "위치 권한이 있으면 이름으로, 없으면 비워 둬요",
  placeOn: "켬",
  placeOnDesc: "다닌 자리를 숫자 대신 이름으로 보여줘요",
  placeOff: "끔",
  placeOffDesc: "장소 이름을 옮기지 않아요",
  placeCancel: "취소",
  placeNotice: "좌표를 기기의 지도 서비스에 물어봐요.",
  /* ── 057 — 사진 권한 건너뜀 보조 줄 (보드 `6g`) ── */
  photoSkippedYesterday: skippedLine.yesterday,
  photoSkippedOn: skippedLine.on,
  /* ── 058 — 이 휴대폰 (보드 `6c` ⑥) ── */
  groupDevice: "이 휴대폰",
  deviceModules: "쓰는 모듈",
  deviceWipe: "일기 모두 지우기",
  wipeBody: "되돌릴 수 없어요. 이름과 설정은 남아요.",
  wipeConfirm: "지우기",
  wipeCancel: "취소",
  wipeBlocked: "지금 자동으로 쓰는 중이라 지우지 못했어요.",

  /** 058 — 보드 `wipe.title`. 편수는 숫자 그대로(천 단위 구분 없음, FR-010) */
  wipeTitle: (n: number): string => `일기 ${n}편을 모두 지울까요?`,
};

/** 설정 겹의 틀 */
export const frame = {
  /** 설정 값을 아직 못 읽었을 때 설정 겹에 잠깐 보이는 줄 (`App.tsx`) */
  settingsLoading: "설정을 읽는 중…",
};

/** 매일 쓰는 시각의 문장 틀 (056 `target-hour.ts`) */
export const targetHour = {
  /** 보드 `time.am`·`time.pm` */
  meridiem: { am: "오전", pm: "오후" },
  /** 24시간 형식 — 「22시」 */
  hour24: (hour: number): string => `${hour}시`,
  /** 12시간 형식 — 「오후 10시」 */
  hour12: (meridiem: string, cell: number): string => `${meridiem} ${cell}시`,
  /** 행 값 — 「오후 10시쯤」(보드 `settings.autoWriteTime.value12`·`value24`) */
  approx: (hourText: string): string => `${hourText}쯤`,
  /** 미리보기의 날 낱말 — 0–11시는 「어제」, 12–23시는 「그날」(056 Clarification Q2) */
  previewYesterday: "어제",
  previewSameDay: "그날",
  /** 보드 `time.preview` */
  preview: (hourText: string, day: string): string =>
    `매일 ${hourText}쯤 ${day} 일기를 써요. 이미 쓴 날은 건너뛰어요.`,
  /** 보드 `time.tz` */
  timeZoneLine: (city: string, gmt: string): string => `이 휴대폰의 시간대 · ${city} (${gmt})`,
  /** 시간대 식별자 → 도시 이름. **사람이 못 박은 표다**(056 Clarification Q3). 없으면 식별자 꼬리를 쓴다 */
  cityNames: {
    "Asia/Seoul": "서울",
    "Asia/Tokyo": "도쿄",
    "Asia/Shanghai": "상하이",
    "Asia/Hong_Kong": "홍콩",
    "Asia/Singapore": "싱가포르",
    "Europe/London": "런던",
    "Europe/Paris": "파리",
  } as Readonly<Record<string, string>>,
};
