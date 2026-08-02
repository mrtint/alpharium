/**
 * T028 ⚖️ 원칙 IV — 신호 정제 계약 (원시 로그 → 추론 입력)
 *
 * - 003 FR-255 / 001 SC-004: 원시 로그가 집계에 남지 않고, 산출 후 중간 결과물도 남지 않는다
 * - 003 FR-260: 집계는 **생성 요청 시점에** 만든다 — 상시 수집하지 않는다
 * - 003 FR-257: 항목별 상한·시간대 세분도는 매개변수이며 값이 비어 있다 (T060이 채운다)
 */
import { buildDigest, type SourceReaders } from "../../src/signals/digest-builder";
import { DEFAULT_DIGEST_PARAMS, DIGEST_PARAM_KEYS } from "../../src/signals/digest-params";
import { DEFAULT_SCALE_PARAMS } from "../../src/signals/scale";
import { DIGEST_FIELDS, isDigest } from "../../src/signals/digest";
import { observed, unobserved } from "../../src/signals/observation";

const window = { date: "2026-08-02", observedAt: new Date("2026-08-02T18:30:00+09:00") };

const params = { digest: DEFAULT_DIGEST_PARAMS, scale: DEFAULT_SCALE_PARAMS };

/** 원시 로그를 그대로 흘려보내려 하는 소스들. 계약이 이것을 막아야 한다. */
const leakyReaders: SourceReaders = {
  activity: async () => ({
    steps: observed(8123),
    activePeriods: observed(["아침", "저녁"]),
    // 계약 밖의 원시 로그 — 집계에 자리가 없어야 한다.
    ...({ minuteLog: [{ at: "08:31", steps: 42 }] } as Record<string, unknown>),
  }),
  location: async () => ({
    stays: observed([{ place: "집", period: observed("저녁") }]),
    moved: observed(true),
    ...({ track: [{ lat: 37.5665, lon: 126.978, speed: 1.2 }] } as Record<string, unknown>),
  }),
  photo: async () => ({
    photos: observed([{ period: observed("아침"), place: observed("집"), caption: unobserved() }]),
    ...({ uris: ["file:///DCIM/IMG_0001.jpg"], exif: { GPSLatitude: 37.5 } } as Record<string, unknown>),
  }),
  calendar: async () => ({
    events: observed([{ title: "치과", period: observed("낮") }]),
    ...({ attendees: ["a@b.com"], description: "본문", eventId: "evt-1" } as Record<string, unknown>),
  }),
};

describe("원시 로그가 집계에 남지 않는다 (003 FR-255, 001 SC-004)", () => {
  it("소스가 흘려보낸 원시 로그가 집계에 없다", async () => {
    const digest = await buildDigest(window, leakyReaders, params);

    expect(Object.keys(digest).sort()).toEqual([...DIGEST_FIELDS].sort());
    expect(isDigest(digest)).toBe(true);
  });

  it("좌표·경로·속도가 없다 (003 FR-249·FR-251)", async () => {
    const raw = JSON.stringify(await buildDigest(window, leakyReaders, params));
    expect(raw).not.toMatch(/lat|lon|speed|track|coordinate/i);
  });

  it("사진 원본·경로·기기 정보가 없다 (003 FR-252)", async () => {
    const raw = JSON.stringify(await buildDigest(window, leakyReaders, params));
    expect(raw).not.toMatch(/uri|file:|DCIM|exif|GPS/i);
  });

  it("일정의 참석자·설명 본문·식별자가 없다 (003 FR-253)", async () => {
    const raw = JSON.stringify(await buildDigest(window, leakyReaders, params));
    expect(raw).not.toMatch(/attendee|description|eventId|@/i);
  });

  it("분 단위 로그가 없다 (003 FR-248)", async () => {
    const digest = await buildDigest(window, leakyReaders, params);
    const raw = JSON.stringify(digest);

    expect(raw).not.toMatch(/minuteLog/i);

    // 활동은 시간대 목록이며 시각을 담지 않는다. 관측 시점(FR-244의 항목)은
    // 집계에 남아야 하므로 검사 대상에서 뺀다.
    const withoutObservedAt = JSON.stringify({ ...digest, observedAt: "" });
    expect(withoutObservedAt).not.toMatch(/\d{2}:\d{2}/);
  });

  it("산출 후 중간 결과물이 남지 않는다 (003 FR-255)", async () => {
    const digest = await buildDigest(window, leakyReaders, params);
    // 집계 밖에 참조를 남기지 않는다 — 돌려주는 것이 전부다.
    expect(Object.keys(digest)).toHaveLength(DIGEST_FIELDS.length);
    expect(digest).not.toHaveProperty("sources");
    expect(digest).not.toHaveProperty("readings");
  });
});

describe("집계는 생성 요청 시점에 만든다 (003 FR-260)", () => {
  it("호출 전에는 소스를 읽지 않는다 — 상시 수집이 아니다", async () => {
    let reads = 0;
    const counting: SourceReaders = {
      activity: async () => {
        reads++;
        return { steps: unobserved(), activePeriods: unobserved() };
      },
      location: async () => ({ stays: unobserved(), moved: unobserved() }),
      photo: async () => ({ photos: unobserved() }),
      calendar: async () => ({ events: unobserved() }),
    };

    expect(reads).toBe(0);
    await buildDigest(window, counting, params);
    expect(reads).toBe(1);
  });

  it("관측 시점이 집계에 기록된다", async () => {
    const digest = await buildDigest(window, leakyReaders, params);
    expect(digest.observedAt).toBe(window.observedAt.toISOString());
    expect(digest.date).toBe(window.date);
  });

  it("다시 호출하면 그 시점의 집계를 새로 만든다 (001 FR-040a, 003 FR-263)", async () => {
    const later = { date: window.date, observedAt: new Date("2026-08-02T22:00:00+09:00") };
    const first = await buildDigest(window, leakyReaders, params);
    const second = await buildDigest(later, leakyReaders, params);

    expect(second.observedAt).not.toBe(first.observedAt);
  });
});

describe("항목별 상한·시간대 세분도는 매개변수다 (003 FR-257 — T060이 채운다)", () => {
  it("매개변수 자리가 존재한다", () => {
    for (const key of DIGEST_PARAM_KEYS) {
      expect(DEFAULT_DIGEST_PARAMS).toHaveProperty(key);
    }
  });

  it("상한이 주어지면 항목 수가 그 이하로 줄어든다", async () => {
    const many: SourceReaders = {
      ...leakyReaders,
      photo: async () => ({
        photos: observed(
          Array.from({ length: 50 }, () => ({
            period: observed("낮"),
            place: unobserved(),
            caption: unobserved(),
          })),
        ),
      }),
    };

    const digest = await buildDigest(window, many, {
      ...params,
      digest: { ...DEFAULT_DIGEST_PARAMS, maxPhotos: 5 },
    });

    expect(digest.photos).toEqual(expect.objectContaining({ status: "observed" }));
    expect(digest.photoCount).toEqual(observed(5));
  });
});
