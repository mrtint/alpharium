/**
 * T011 — 일기 엔티티 (004 FR-300·FR-301, 001 FR-018·FR-039)
 *
 * **날짜·퍼소나 귀속·본문 셋이 전부다.** 제목·태그·기분을 두지 않으며(004 FR-301),
 * 재료 요약도 두지 않는다 — 저장하지 않고 표시 시점에 파생한다 (004 FR-304).
 */

export interface DiaryEntry {
  /** 생성을 **요청한 시점**의 로컬 날짜로 고정 (001 FR-039). */
  readonly date: string;
  /** 어느 퍼소나가 썼는지 (001 FR-018). */
  readonly personaName: string;
  /** 하나의 텍스트 덩어리. 비어 있지 않다 (004 FR-301·FR-302). */
  readonly body: string;
}

/** 004 FR-300의 항목 목록. **이것이 전부다.** */
export const DIARY_FIELDS = ["date", "personaName", "body"] as const;

export type DiaryField = (typeof DIARY_FIELDS)[number];

export function createDiaryEntry(input: DiaryEntry): DiaryEntry {
  if (input.body.trim().length === 0) {
    throw new Error("일기 본문은 비어 있을 수 없다 (004 FR-302)");
  }
  return { date: input.date, personaName: input.personaName, body: input.body };
}

/** 목록 밖의 항목이 섞이면 일기로 인정하지 않는다 (004 FR-301). */
export function isDiaryEntry(value: unknown): value is DiaryEntry {
  if (typeof value !== "object" || value === null) return false;

  const keys = Object.keys(value).sort();
  if (keys.join(",") !== [...DIARY_FIELDS].sort().join(",")) return false;

  const d = value as Record<DiaryField, unknown>;
  return (
    typeof d.date === "string" &&
    typeof d.personaName === "string" &&
    typeof d.body === "string" &&
    d.body.trim().length > 0
  );
}
