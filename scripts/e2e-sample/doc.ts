/**
 * 070 — 사람이 읽는 표본 표 문서 (`docs/e2e/sample-table.md`)를 표(`manifest.ts`)와 사진 목록(`photos.json`)에서 그린다 (순수).
 *
 * 계약: specs/070-e2e-sample-seed/contracts/sample-manifest.md D-1~D-3
 *
 * 문서는 이 함수의 출력과 **글자 단위로 같아야 한다**(`__tests__/e2e-sample/doc-match.test.ts`) — 표나 목록을 고치고 문서를 안 고치면(또는 반대) 테스트가 실패한다.
 * 다시 쓰려면 `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/sample-doc.mts`.
 */

import { urlToTitle } from "./doc-util.ts";
import type { CatalogPhoto } from "./catalog.ts";
import { CLUSTERS, DAYS, JITTER_METERS, SITUATIONS, situationOf, type Place } from "./manifest.ts";

const PLACE_NAMES: Record<Place, string> = {
  home: "집 (망원한강공원 근처)",
  work: "직장 (강남역 근처)",
  cafe: "단골 가게 (서울숲 근처)",
  weekend: "주말 나들이 (양평 두물머리 근처)",
};

export function renderSampleTable(catalog: readonly CatalogPhoto[]): string {
  const out: string[] = [];
  const total = DAYS.reduce((n, d) => n + situationOf(d.situation).slots.length, 0);

  out.push("# e2e 표본 표 — 30일치 가상의 하루 (070)", "");
  out.push(
    "층 1 실행 앞단의 「표본 보장」이 전용 테스트 기기의 `PocketlogSeed/` 아래에 심는 사진의 정본 표다. 이 문서는 `scripts/e2e-sample/manifest.ts`·`photos.json`에서 그려지고 " +
      "(`scripts/sample-doc.mts`), 둘이 어긋나면 `__tests__/e2e-sample/doc-match.test.ts`가 실패한다.",
    "",
  );
  out.push(
    `- 범위: 오늘로부터 1~30일 전 **30일**, 사진 **${total}장**. 오늘은 심지 않는다(층 1 쓴 날 픽스처가 오늘을 차지한다).`,
    "- **「장소 N곳」은 군집 수가 아니라 순차 방문 수다** — 사진을 시각순으로 놓고 직전 자리와 100m를 넘으면 새 자리로 센다(집→직장→집 = 3곳). 기대 장소 수는 사람이 적은 값이다.",
    `- 방문 안 위치 흔들림은 ${JITTER_METERS}m 이내(한 자리로 묶임), 군집 사이는 1km 이상.`,
    "- 일기 품질을 결론짓지 않는다. 얻는 것은 「사진 수집 → 재료 판정 → 장소 묶기 경로가 도는가」다(010, 원칙 V).",
    "- **iOS 시뮬레이터는 범위 밖이다(미검증)** — 표는 플랫폼에 중립이다.",
    "",
  );

  out.push("## 군집", "", "| 이름 | 위치 | 위도 | 경도 | 흔들림 |", "| --- | --- | --- | --- | --- |");
  for (const place of Object.keys(CLUSTERS) as Place[]) {
    const c = CLUSTERS[place];
    out.push(`| ${place} | ${PLACE_NAMES[place]} | ${c.latitude} | ${c.longitude} | ≤ ${JITTER_METERS}m |`);
  }
  out.push("");

  out.push(
    "## 상황",
    "",
    "| 상황 | 설명 | 사진 | 방문 순서 | 기대 장소 |",
    "| --- | --- | --- | --- | --- |",
  );
  for (const s of SITUATIONS) {
    out.push(`| ${s.name} | ${s.description} | ${s.slots.length} | ${s.visits.length === 0 ? "—" : s.visits.join(" → ")} | ${s.expectPlaces} |`);
  }
  out.push("");

  out.push(
    "## 날 표",
    "",
    "오프셋 = 오늘로부터 며칠 전. **대표 날**은 `sample-days` 흐름이 달력으로 이동해 사진 칸·장소 칸을 확인하는 날이다.",
    "",
    "| 오프셋 | 상황 | 사진 | 기대 장소 | 대표 날 | 심은 촬영 시각 · 폴더 · 위치 |",
    "| --- | --- | --- | --- | --- | --- |",
  );
  for (const d of DAYS) {
    const s = situationOf(d.situation);
    const shots =
      s.slots.length === 0
        ? "—"
        : s.slots
            .map((slot) => {
              const where = slot.place === null ? "위치 없음" : slot.place;
              const folder = slot.folder === "Camera" ? "" : ` ${slot.folder}`;
              return `${slot.time}${folder} ${where}`;
            })
            .join(", ");
    out.push(`| ${d.offset} | ${d.situation} | ${s.slots.length} | ${s.expectPlaces} | ${d.probe === true ? "○" : "—"} | ${shots} |`);
  }
  out.push("");

  out.push(
    "## 사진 출처",
    "",
    `Wikimedia Commons의 CC0·퍼블릭 도메인 파일 ${catalog.length}장(소유자가 풀을 200장 이상으로 정했다, 2026-10-10). 직접 URL은 upload.wikimedia.org의 960px 축소본이다. ` +
      "받은 파일은 `scripts/e2e-sample/.cache/`(gitignore)에만 있고 저장소에는 `photos.json` 목록만 있다. 심을 때 원래 EXIF는 걷고 표가 정한 촬영 시각·GPS만 새로 쓴다.",
    "",
    "| 목록 파일 | 태그 | 라이선스 | 확인 일자 | Commons 파일 |",
    "| --- | --- | --- | --- | --- |",
  );
  for (const p of catalog) {
    out.push(`| ${p.file} | ${p.tags.join(", ")} | ${p.license} | ${p.checkedOn} | [${urlToTitle(p.sourcePage)}](${p.sourcePage}) |`);
  }
  out.push("");
  return out.join("\n");
}
