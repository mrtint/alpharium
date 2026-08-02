/**
 * T024 ⚖️ 원칙 IV — 권한 거부 분기
 *
 * - 003 FR-217: **모든 소스가 거부되어도 집계 한 덩어리를 산출한다**(비어 있음으로 판정)
 * - 헌법 원칙 V: 거부는 크래시가 아닌 기능 축소로 처리한다
 */
import {
  SignalSource,
  PermissionState,
  requestSourcePermissions,
  isGranted,
  type PermissionRequester,
  type PermissionMap,
} from "../../src/signals/permissions";
import { buildDigest } from "../../src/signals/digest-builder";
import { isDigest, DIGEST_FIELDS } from "../../src/signals/digest";
import { isObserved, isUnobserved, observed, unobserved } from "../../src/signals/observation";
import { DEFAULT_SCALE_PARAMS, ScaleVerdict } from "../../src/signals/scale";
import { DEFAULT_DIGEST_PARAMS } from "../../src/signals/digest-params";

const ALL_SOURCES = Object.values(SignalSource);

const requesterThatDenies = (denied: readonly SignalSource[]): PermissionRequester => ({
  request: async (source) =>
    denied.includes(source) ? PermissionState.Denied : PermissionState.Granted,
});

const window = { date: "2026-08-02", observedAt: new Date("2026-08-02T18:30:00+09:00") };

/** 권한이 있으면 값을, 없으면 미관측을 내놓는 소스들. */
const readers = (permissions: PermissionMap) => ({
  activity: async () =>
    isGranted(permissions, SignalSource.Activity)
      ? { steps: observed(3000), activePeriods: observed(["저녁" as const]) }
      : { steps: unobserved<number>(), activePeriods: unobserved<readonly "저녁"[]>() },
  location: async () =>
    isGranted(permissions, SignalSource.Location)
      ? { stays: observed([{ place: "집", period: observed("저녁") }]), moved: observed(true) }
      : { stays: unobserved(), moved: unobserved<boolean>() },
  photo: async () =>
    isGranted(permissions, SignalSource.Photo) ? { photos: observed([]) } : { photos: unobserved() },
  calendar: async () =>
    isGranted(permissions, SignalSource.Calendar) ? { events: observed([]) } : { events: unobserved() },
});

const buildWith = (permissions: PermissionMap) =>
  buildDigest(window, readers(permissions), {
    digest: DEFAULT_DIGEST_PARAMS,
    scale: DEFAULT_SCALE_PARAMS,
  });

describe("권한 요청 (헌법 원칙 V)", () => {
  it("거부는 크래시가 아니라 상태로 돌아온다", async () => {
    const permissions = await requestSourcePermissions(requesterThatDenies(ALL_SOURCES));
    for (const source of ALL_SOURCES) {
      expect(permissions[source]).toBe(PermissionState.Denied);
      expect(isGranted(permissions, source)).toBe(false);
    }
  });

  it("요청 중 예외가 나도 거부로 다룬다 — 크래시하지 않는다", async () => {
    const throwing: PermissionRequester = {
      request: async () => {
        throw new Error("네이티브 모듈 없음");
      },
    };
    const permissions = await requestSourcePermissions(throwing);
    expect(Object.values(permissions).every((s) => s === PermissionState.Denied)).toBe(true);
  });
});

describe("소스별 거부에서도 집계가 산출된다 (003 FR-217)", () => {
  it.each(ALL_SOURCES)("%s 하나가 거부되어도 집계 한 덩어리가 나온다", async (denied) => {
    const permissions = await requestSourcePermissions(requesterThatDenies([denied]));
    const digest = await buildWith(permissions);

    expect(isDigest(digest)).toBe(true);
    expect(Object.keys(digest).sort()).toEqual([...DIGEST_FIELDS].sort());
  });

  it("거부된 소스의 항목만 미관측이고 나머지는 관측된다", async () => {
    const permissions = await requestSourcePermissions(requesterThatDenies([SignalSource.Location]));
    const digest = await buildWith(permissions);

    expect(isUnobserved(digest.stays)).toBe(true);
    expect(isUnobserved(digest.moved)).toBe(true);
    expect(isObserved(digest.steps)).toBe(true);
    expect(isObserved(digest.events)).toBe(true);
  });
});

describe("전체 거부 (003 FR-217)", () => {
  it("모든 소스가 거부되어도 집계 한 덩어리를 산출한다", async () => {
    const permissions = await requestSourcePermissions(requesterThatDenies(ALL_SOURCES));
    const digest = await buildWith(permissions);

    expect(isDigest(digest)).toBe(true);
    expect(digest.date).toBe(window.date);
  });

  it("전체 거부의 판정은 「비어 있음」이다", async () => {
    const permissions = await requestSourcePermissions(requesterThatDenies(ALL_SOURCES));
    expect((await buildWith(permissions)).scale).toBe(ScaleVerdict.Empty);
  });

  it("전체 거부에서 크래시하지 않는다", async () => {
    const permissions = await requestSourcePermissions(requesterThatDenies(ALL_SOURCES));
    await expect(buildWith(permissions)).resolves.toBeDefined();
  });
});
