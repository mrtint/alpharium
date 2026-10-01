/**
 * 매일 쓰는 시각의 표기·격자·미리보기·시간대 줄 (056, 보드 `6c` ③·`6f`).
 *
 * 계약: specs/056-settings-time-place/contracts/settings-time-place.md TH1~TH10
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **순수하다** — 시(0–23)·형식·시간대 식별자·시차를 인자로만 받는다. 기기에서 형식·시간대를 읽는 일은
 * `device-clock.ts`가 하고, 화면은 이 함수들이 준 문자열·칸 목록을 그린다(FR-037).
 *
 * **「쯤」을 늘 붙인다**(020 FR-002, 056 FR-035) — 자동 생성은 목표 시각부터 3시간 창에서 시도하고(020 판정)
 * OS가 더 늦출 수 있다(019 실측). 정확한 시각을 약속하는 표기를 두지 않는다.
 *
 * **미리보기의 날 낱말**(056 Clarification Q2): 오전(0–11시) 시도 창에서는 사흘 범위(`selectableDays`)에 오늘이
 * 아직 없어 어제를 쓴다 — 그래서 0–11시는 「어제」, 12–23시는 보드 원문 「그날」이다. 판정을 바꾸지 않고 문구가
 * 사실대로 말한다.
 *
 * 문장 틀은 이 파일에 둔다 — `src/app/`이 `src/ui/settings-text.ts`를 import하면 계층이 거꾸로 선다(research R8).
 * 보드 원문: `settings.autoWriteTime.value12`·`value24`, `time.preview`, `time.tz`, `time.am`·`time.pm`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type HourFormat = "h12" | "h24";
export type Meridiem = "am" | "pm";

/** 보드 `time.am`·`time.pm` */
const MERIDIEM_TEXT: Record<Meridiem, string> = { am: "오전", pm: "오후" };

/**
 * 시간대 식별자 → 도시 이름. **사람이 못 박은 표다**(056 Clarification Q3) — 코드가 도시 이름을 지어내지 않는다.
 * 표에 없으면 식별자의 도시 부분을 그대로 쓴다(`cityOf`).
 */
const CITY_NAMES: Readonly<Record<string, string>> = {
  "Asia/Seoul": "서울",
  "Asia/Tokyo": "도쿄",
  "Asia/Shanghai": "상하이",
  "Asia/Hong_Kong": "홍콩",
  "Asia/Singapore": "싱가포르",
  "Europe/London": "런던",
  "Europe/Paris": "파리",
};

/** 오전(0–11) / 오후(12–23) */
export function meridiemOf(hour: number): Meridiem {
  return hour < 12 ? "am" : "pm";
}

/** 12시간 격자의 칸 숫자(1–12). 0시·12시는 12 칸이다 */
export function cellOf(hour: number): number {
  const h = hour % 12;
  return h === 0 ? 12 : h;
}

/** 12시간 격자의 칸 + 오전/오후 → 시. 칸 12는 오전 0시·오후 12시 */
export function hourOfCell(cell: number, meridiem: Meridiem): number {
  const base = cell === 12 ? 0 : cell;
  return meridiem === "am" ? base : base + 12;
}

/** 격자 칸 순서 — 12시간 `[12, 1, …, 11]`(4열), 24시간 `[0, …, 23]`(6열) */
export function hourCells(format: HourFormat): readonly number[] {
  if (format === "h24") return Array.from({ length: 24 }, (_, h) => h);
  return [12, ...Array.from({ length: 11 }, (_, i) => i + 1)];
}

/** 「{오전|오후} {h}시」 또는 「{h}시」 — 「쯤」 앞까지 */
function hourText(hour: number, format: HourFormat): string {
  if (format === "h24") return `${hour}시`;
  return `${MERIDIEM_TEXT[meridiemOf(hour)]} ${cellOf(hour)}시`;
}

/** 행 값 — 「오후 10시쯤」 / 「22시쯤」(보드 `settings.autoWriteTime.value12`·`value24`) */
export function formatTargetHour(hour: number, format: HourFormat): string {
  return `${hourText(hour, format)}쯤`;
}

/** 미리보기 — 「매일 오후 10시쯤 그날 일기를 써요. 이미 쓴 날은 건너뛰어요.」(보드 `time.preview`, 오전은 「어제」) */
export function previewSentence(hour: number, format: HourFormat): string {
  const day = hour < 12 ? "어제" : "그날";
  return `매일 ${hourText(hour, format)}쯤 ${day} 일기를 써요. 이미 쓴 날은 건너뛰어요.`;
}

/** 동쪽으로 몇 분 → 「GMT+9」·「GMT-3:30」·「GMT」 */
export function formatGmt(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "GMT";
  const sign = offsetMinutes > 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return minutes === 0
    ? `GMT${sign}${hours}`
    : `GMT${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

function cityOf(timeZoneId: string): string {
  const known = CITY_NAMES[timeZoneId];
  if (known !== undefined) return known;
  const tail = timeZoneId.slice(timeZoneId.lastIndexOf("/") + 1);
  return tail.replace(/_/g, " ");
}

/**
 * 시간대 줄 — 「이 휴대폰의 시간대 · 서울 (GMT+9)」(보드 `time.tz`). 식별자를 못 읽었으면 `null` — 줄을 그리지 않는다
 * (지어내지 않는다, 원칙 V).
 */
export function timeZoneLine(timeZoneId: string | null, offsetMinutes: number): string | null {
  if (timeZoneId === null || timeZoneId === "") return null;
  return `이 휴대폰의 시간대 · ${cityOf(timeZoneId)} (${formatGmt(offsetMinutes)})`;
}

/**
 * `Intl.DateTimeFormat#resolvedOptions()`의 시간 주기 → 형식. 못 읽으면 12시간(056 FR-038).
 * 기기 설정의 「24시간 형식」 스위치는 `Intl`이 보지 못한다(research R1 — 미확인 잔여).
 */
export function hourFormatFrom(
  options: { hourCycle?: string; hour12?: boolean } | null,
): HourFormat {
  if (options === null) return "h12";
  if (options.hourCycle === "h23" || options.hourCycle === "h24") return "h24";
  if (options.hourCycle === "h11" || options.hourCycle === "h12") return "h12";
  if (options.hour12 === false) return "h24";
  return "h12";
}
