/**
 * 축을 엮는 자리 — 실제 소스와 어댑터를 흐름에 붙인다.
 *
 * 각 축의 결정을 여기서 **다시 내리지 않는다**. 이 파일이 하는 일은 3a·3b·3c의
 * 구현체를 골라 `generate-flow`가 요구하는 형태로 넘기는 것뿐이다.
 */
import { requestSourcePermissions, isGranted, SignalSource, type PermissionMap } from "../signals/permissions";
import type { SourceReaders } from "../signals/digest-builder";
import { readActivity, pedometerProvider } from "../signals/sources/activity";
import { readLocation, deviceLocationProvider } from "../signals/sources/location";
import { readPhotos, mediaLibraryProvider } from "../signals/sources/photo";
import { readEvents, deviceCalendarProvider } from "../signals/sources/calendar";
import { unobserved } from "../signals/observation";
import { DEFAULT_DIGEST_PARAMS } from "../signals/digest-params";
import { DEFAULT_SCALE_PARAMS } from "../signals/scale";
import { DEFAULT_PROMPT_PARAMS } from "../inference/prompt";
import { EMPTY_MARKERS } from "../speaker/verify";
import { selectEngine } from "../inference/engines";
import { Repository } from "../storage/repository";
import { PersonaStore } from "../storage/persona-store";
import { AsyncStorageKeyValueStore } from "../storage/async-storage";
import { assignPersona } from "../persona/assign";
import type { Persona } from "../persona/persona";

/**
 * **사용 시점에** 권한을 묻고 소스를 읽는다 (헌법 원칙 V) — 생성 요청이 있어야
 * 권한 창이 뜬다. 거부된 소스는 미관측이 되고 집계는 그대로 산출된다 (003 FR-217).
 */
export function lazyReaders(): SourceReaders {
  // 권한 요청은 **소스를 실제로 읽을 때** 시작된다 — 화면이 그려지는 시점이 아니다.
  // 한 번 물으면 그 결과를 네 소스가 함께 쓴다.
  let readers: Promise<SourceReaders> | null = null;
  const resolve = () => (readers ??= requestPermissions().then(readersFor));

  return {
    activity: async (w) => (await resolve()).activity(w),
    location: async (w) => (await resolve()).location(w),
    photo: async (w) => (await resolve()).photo(w),
    calendar: async (w) => (await resolve()).calendar(w),
  };
}

/** 권한 거부는 미관측이다 — 크래시가 아닌 기능 축소 (003 FR-217, 헌법 원칙 V). */
export function readersFor(permissions: PermissionMap): SourceReaders {
  return {
    activity: (w) =>
      isGranted(permissions, SignalSource.Activity)
        ? readActivity(w, pedometerProvider())
        : Promise.resolve({ steps: unobserved(), activePeriods: unobserved() }),
    location: (w) =>
      isGranted(permissions, SignalSource.Location)
        ? readLocation(w, deviceLocationProvider())
        : Promise.resolve({ stays: unobserved(), moved: unobserved() }),
    photo: (w) =>
      isGranted(permissions, SignalSource.Photo)
        ? readPhotos(w, mediaLibraryProvider())
        : Promise.resolve({ photos: unobserved() }),
    calendar: (w) =>
      isGranted(permissions, SignalSource.Calendar)
        ? readEvents(w, deviceCalendarProvider())
        : Promise.resolve({ events: unobserved() }),
  };
}

/** 권한을 사용 시점에 묻는다 (헌법 원칙 V). */
export async function requestPermissions(): Promise<PermissionMap> {
  return requestSourcePermissions({
    async request(source) {
      switch (source) {
        case SignalSource.Location: {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const Location = require("expo-location") as typeof import("expo-location");
          const { status } = await Location.requestForegroundPermissionsAsync();
          return status === "granted" ? "granted" : "denied";
        }
        case SignalSource.Photo: {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const Media = require("expo-media-library") as typeof import("expo-media-library");
          const { status } = await Media.requestPermissionsAsync();
          return status === "granted" ? "granted" : "denied";
        }
        case SignalSource.Calendar: {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const Calendar = require("expo-calendar") as typeof import("expo-calendar");
          const { status } = await Calendar.requestCalendarPermissionsAsync();
          return status === "granted" ? "granted" : "denied";
        }
        case SignalSource.Activity: {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { Pedometer } = require("expo-sensors") as typeof import("expo-sensors");
          const { status } = await Pedometer.requestPermissionsAsync();
          return status === "granted" ? "granted" : "denied";
        }
      }
    },
  } as Parameters<typeof requestSourcePermissions>[0]);
}

/** 로컬 날짜 (`YYYY-MM-DD`). 생성을 **요청한 시점**의 날짜다 (001 FR-039). */
export function localDateOf(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

export function createStores() {
  const kv = new AsyncStorageKeyValueStore();
  return { repository: new Repository(kv), personaStore: new PersonaStore(kv) };
}

/**
 * 퍼소나가 없으면 **앱이** 부여한다 (001 FR-002). 사용자가 고르지 않는다.
 * 동시에 하나만 활성으로 유지된다 (001 FR-007).
 */
export async function ensurePersona(store: PersonaStore): Promise<Persona> {
  const existing = await store.loadActive();
  if (existing !== null) return existing;

  const assigned = assignPersona();
  await store.saveActive(assigned);
  return assigned;
}

export const DEFAULT_PARAMS = {
  buildParams: { digest: DEFAULT_DIGEST_PARAMS, scale: DEFAULT_SCALE_PARAMS },
  promptParams: DEFAULT_PROMPT_PARAMS,
  /** 표지 목록은 T058이 실측으로 채운다 (004 FR-348). */
  markers: EMPTY_MARKERS,
};

export { selectEngine };
