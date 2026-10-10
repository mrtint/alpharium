/**
 * 070 — 「무엇을 심을까」를 정한다 (순수).
 *
 * 계약: specs/070-e2e-sample-seed/contracts/sample-seeding.md P-1~P-6
 *
 * 표(`manifest.ts`)와 사진 목록과 「지금」에서 심을 항목, 표 지문, 층 1 흐름에 넘길 대표 날 값을 만든다. 난수가 없다 — 같은 입력이면 같은 출력이다.
 * 이 파일은 파일·기기에 닿지 않는다(`fs`·`adb` import 없음). 하루 문자열은 `day-boundary.ts`의 `dayOf`가 만든다(자체 하루 계산 금지, DB11).
 */

import { createHash } from "node:crypto";

import { dayOf } from "../../src/config/day-boundary.ts";
import type { CatalogPhoto } from "./catalog.ts";
import { CLUSTERS, DAYS, situationOf, type Folder, type Place, type PhotoTag } from "./manifest.ts";

export type SeedItem = {
  offset: number;
  /** YYYY-MM-DD */
  day: string;
  deviceName: string;
  folder: Folder;
  tag: PhotoTag;
  place: Place | null;
  takenAt: Date;
  coordinate: { latitude: number; longitude: number } | null;
  /** 사진 목록의 파일 이름 */
  catalogFile: string;
};

const METERS_PER_DEGREE_LAT = 111_320;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** 슬롯 번호로 정하는 결정적 흔들림: 각도는 황금각씩 돌고 반지름은 8~40m */
function jitter(index: number): { north: number; east: number } {
  const angle = ((index * 137.508) % 360) * (Math.PI / 180);
  const radius = 8 + ((index * 13) % 33);
  return { north: radius * Math.cos(angle), east: radius * Math.sin(angle) };
}

function coordinateOf(
  place: Place,
  index: number,
  walkNorthMeters: number | undefined,
): { latitude: number; longitude: number } {
  const center = CLUSTERS[place];
  const { north, east } =
    walkNorthMeters === undefined ? jitter(index) : { north: walkNorthMeters, east: 0 };
  const latitude = center.latitude + north / METERS_PER_DEGREE_LAT;
  const longitude =
    center.longitude + east / (METERS_PER_DEGREE_LAT * Math.cos((center.latitude * Math.PI) / 180));
  return { latitude: round6(latitude), longitude: round6(longitude) };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * 표의 모든 슬롯을 심을 항목으로 편다. 오프셋 순서(1→30), 날 안에서는 시각순이다.
 *
 * 슬롯 → 사진 파일은 태그별로 목록 순서(파일 이름순)를 돌며 정한다. 필요한 태그가 목록에 없으면 던진다 — 조용히 다른 사진을 쓰지 않는다.
 */
export function planSample(catalog: readonly CatalogPhoto[], now: Date): SeedItem[] {
  const byTag = new Map<PhotoTag, CatalogPhoto[]>();
  for (const photo of [...catalog].sort((a, b) => a.file.localeCompare(b.file))) {
    for (const tag of photo.tags) byTag.set(tag, [...(byTag.get(tag) ?? []), photo]);
  }
  const used = new Map<PhotoTag, number>();

  const items: SeedItem[] = [];
  let slotIndex = 0;
  for (const day of [...DAYS].sort((a, b) => a.offset - b.offset)) {
    const situation = situationOf(day.situation);
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day.offset, 12);
    const dayText = dayOf(base);

    situation.slots.forEach((slot, i) => {
      const pool = byTag.get(slot.tag);
      if (pool === undefined || pool.length === 0) {
        throw new Error(`사진 목록에 태그 ${slot.tag} 사진이 없다 (${dayText} ${slot.time})`);
      }
      const n = used.get(slot.tag) ?? 0;
      used.set(slot.tag, n + 1);

      const takenAt = new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        Number(slot.time.slice(0, 2)),
        Number(slot.time.slice(3)),
        0,
      );
      items.push({
        offset: day.offset,
        day: dayText,
        deviceName: `s30-${pad2(day.offset)}-${pad2(i + 1)}.jpg`,
        folder: slot.folder,
        tag: slot.tag,
        place: slot.place,
        takenAt,
        coordinate:
          slot.place === null ? null : coordinateOf(slot.place, slotIndex, slot.walkNorthMeters),
        catalogFile: pool[n % pool.length].file,
      });
      slotIndex += 1;
    });
  }
  return items;
}

/**
 * 표 지문 — 표·사진 목록·사진 해시가 바뀌면 바뀐다. **오늘 날짜에는 의존하지 않는다**(기준일은 표식의 `anchor`가 따로 본다).
 * 항목마다 (오프셋, 기기 이름, 폴더, 하루 안의 시각, 좌표 소수 6자리, 사진 파일, 그 사진의 sha256)를 정렬해 해시한다.
 */
export function fingerprint(items: readonly SeedItem[], catalog: readonly CatalogPhoto[]): string {
  const shaOf = new Map(catalog.map((p) => [p.file, p.sha256]));
  const rows = [...items]
    .sort((a, b) => a.deviceName.localeCompare(b.deviceName))
    .map((i) => [
      i.offset,
      i.deviceName,
      i.folder,
      `${pad2(i.takenAt.getHours())}:${pad2(i.takenAt.getMinutes())}`,
      i.coordinate === null ? null : [i.coordinate.latitude.toFixed(6), i.coordinate.longitude.toFixed(6)],
      i.catalogFile,
      shaOf.get(i.catalogFile) ?? "",
    ]);
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex").slice(0, 16);
}

/**
 * 층 1 흐름에 `maestro test -e`로 넘길 대표 날 값. 키는 `P<n>_DATE`·`P<n>_BACK`·`P<n>_PHOTOS`·`P<n>_PLACES`(n = 0..7, 오프셋 순).
 * 값은 날짜·숫자뿐이다(공백·따옴표 없음). `BACK`은 달력을 이전 달로 몇 번 넘겨야 하나 — 오늘의 달과 그 날의 달 차이다.
 */
export function probeEnv(now: Date): Record<string, string> {
  const env: Record<string, string> = {};
  const probes = DAYS.filter((d) => d.probe === true).sort((a, b) => a.offset - b.offset);
  probes.forEach((d, n) => {
    const situation = situationOf(d.situation);
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d.offset, 12);
    const back = now.getFullYear() * 12 + now.getMonth() - (base.getFullYear() * 12 + base.getMonth());
    env[`P${n}_DATE`] = dayOf(base);
    env[`P${n}_BACK`] = String(back);
    env[`P${n}_PHOTOS`] = String(situation.slots.length);
    env[`P${n}_PLACES`] = String(situation.expectPlaces);
  });
  return env;
}
