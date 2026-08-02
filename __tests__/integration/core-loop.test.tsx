/**
 * T057 — 통합 테스트: [quickstart.md] 시나리오 1·2·3b·4
 *
 * - 시나리오 1 (정상): 일기가 근거 집계와 함께 저장되고 상세에서 대조된다
 * - 시나리오 2 (빈 집계): 추론이 **시도되지 않고** 일기가 저장되지 않는다
 * - 시나리오 3b (시각 무제약): 생성이 **시각을 이유로 거부되지 않는다** (001 SC-013)
 * - 시나리오 4 (덮어쓰기와 재생성): **두 번째 일기가 두 번째 집계와 짝지어져 있다** (001 SC-011)
 *
 * **일기의 내용이 실제 하루와 맞는지는 검증하지 않는다** (001 SC-009, 헌법 원칙 0).
 */
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { ConfirmKind, runGenerateFlow, type Confirmer, type FlowDeps } from "../../src/ui/generate-flow";
import { DiaryDetail } from "../../src/ui/screens/DiaryDetail";
import { RecordList } from "../../src/ui/screens/RecordList";
import { Repository } from "../../src/storage/repository";
import { InMemoryKeyValueStore } from "../../src/storage/kv";
import { DEFAULT_DIGEST_PARAMS } from "../../src/signals/digest-params";
import { DEFAULT_SCALE_PARAMS } from "../../src/signals/scale";
import { DEFAULT_PROMPT_PARAMS } from "../../src/inference/prompt";
import { EMPTY_MARKERS } from "../../src/speaker/verify";
import { createPersona } from "../../src/persona/persona";
import { TRAIT_CATALOG } from "../../src/persona/catalog";
import { observed, unobserved } from "../../src/signals/observation";
import type { AIEngine } from "../../src/inference/engine";
import type { SourceReaders } from "../../src/signals/digest-builder";
import { deriveMaterialSummary } from "../../src/ui/material-summary";

const DATE = "2026-08-02";
const persona = () => createPersona({ name: "네모", traitId: TRAIT_CATALOG[0].id });

/** 모든 소스가 관측된 하루. */
const richReaders: SourceReaders = {
  activity: async () => ({ steps: observed(8123), activePeriods: observed(["아침", "저녁"]) }),
  location: async () => ({
    stays: observed([{ place: "집", period: observed("저녁") }]),
    moved: observed(true),
  }),
  photo: async () => ({
    photos: observed([{ period: observed("낮"), place: unobserved(), caption: observed("창밖") }]),
  }),
  calendar: async () => ({ events: observed([{ title: "치과", period: observed("낮") }]) }),
};

/** 아무것도 관측되지 않은 하루 — 전 소스 권한 거부로도 재현된다 (003 FR-217). */
const emptyReaders: SourceReaders = {
  activity: async () => ({ steps: unobserved(), activePeriods: unobserved() }),
  location: async () => ({ stays: unobserved(), moved: unobserved() }),
  photo: async () => ({ photos: unobserved() }),
  calendar: async () => ({ events: unobserved() }),
};

const alwaysProceed: Confirmer = { confirm: async () => true };

const engineOf = (calls: { count: number }, body = "주인은 오늘 부지런했다."): AIEngine => ({
  kind: "cloud",
  generate: async () => {
    calls.count++;
    return { rawText: body };
  },
});

const depsFor = (
  repository: Repository,
  readers: SourceReaders,
  engine: AIEngine,
  observedAt = new Date(`${DATE}T18:30:00+09:00`),
): FlowDeps => ({
  window: { date: DATE, observedAt },
  readers,
  buildParams: { digest: DEFAULT_DIGEST_PARAMS, scale: DEFAULT_SCALE_PARAMS },
  persona: persona(),
  engine,
  markers: EMPTY_MARKERS,
  promptParams: DEFAULT_PROMPT_PARAMS,
  repository,
  confirmer: alwaysProceed,
});

describe("시나리오 1 — 정상 경로 (001 AS-1·AS-2, SC-002)", () => {
  it("일기 한 편이 근거 집계와 함께 저장되어 조회 가능하다", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    const calls = { count: 0 };

    const outcome = await runGenerateFlow(depsFor(repo, richReaders, engineOf(calls)));

    expect(outcome.kind).toBe("completed");
    expect(calls.count).toBe(1);

    const bundle = await repo.findByDate(DATE);
    expect(bundle?.diary.body).toBe("주인은 오늘 부지런했다.");
    expect(bundle?.digest.date).toBe(DATE);
  });

  it("일기 상세에서 본문·재료 요약·근거 집계·퍼소나 이름에 도달한다 (006 FR-504)", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await runGenerateFlow(depsFor(repo, richReaders, engineOf({ count: 0 })));
    const bundle = (await repo.findByDate(DATE))!;

    const { getByTestId } = render(<DiaryDetail bundle={bundle} />);

    expect(getByTestId("diary-detail-body").props.children).toBe("주인은 오늘 부지런했다.");
    expect(getByTestId("diary-detail-summary")).toBeTruthy();
    expect(getByTestId("digest-view")).toBeTruthy();
    expect(JSON.stringify(getByTestId("diary-detail-persona").props.children)).toContain("네모");
  });

  it("집계가 별도 영역으로 벗어나지 않고 본문과 대조된다 (006 FR-510)", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await runGenerateFlow(depsFor(repo, richReaders, engineOf({ count: 0 })));
    const bundle = (await repo.findByDate(DATE))!;

    // 본문과 근거가 같은 화면 안에 함께 있다 — 별도 화면으로 밀려나지 않는다.
    const { getByTestId } = render(<DiaryDetail bundle={bundle} />);
    expect(getByTestId("diary-detail-body")).toBeTruthy();
    expect(getByTestId("diary-detail-evidence")).toBeTruthy();
  });

  it("재료 요약의 셈이 집계의 관측 항목과 일치한다 (004 FR-303)", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await runGenerateFlow(depsFor(repo, richReaders, engineOf({ count: 0 })));
    const bundle = (await repo.findByDate(DATE))!;

    const summary = deriveMaterialSummary(bundle.digest);
    expect(summary.find((c) => c.label === "머문 곳")?.count).toBe(1);
    expect(summary.find((c) => c.label === "사진")?.count).toBe(1);
    expect(summary.find((c) => c.label === "일정")?.count).toBe(1);
  });

  it("보이는 기록 목록에 나타나고 상세로 이동할 수 있다 (006 FR-502·FR-503)", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await runGenerateFlow(depsFor(repo, richReaders, engineOf({ count: 0 })));

    const opened: string[] = [];
    const { getByTestId } = render(
      <RecordList bundles={await repo.listVisible()} onOpen={(d) => opened.push(d)} />,
    );

    fireEvent.press(getByTestId(`record-list-item-${DATE}`));
    expect(opened).toEqual([DATE]);
  });
});

describe("시나리오 2 — 빈 집계 (001 AS-3, FR-013)", () => {
  it("추론이 시도되지 않는다 — 모델 호출이 일어나지 않는다", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    const calls = { count: 0 };

    const outcome = await runGenerateFlow(depsFor(repo, emptyReaders, engineOf(calls)));

    expect(outcome.kind).toBe("empty-digest");
    expect(calls.count).toBe(0);
  });

  it("그 날짜를 조회했을 때 일기가 존재하지 않는다", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await runGenerateFlow(depsFor(repo, emptyReaders, engineOf({ count: 0 })));

    expect(await repo.findByDate(DATE)).toBeNull();
    expect(await repo.listVisible()).toHaveLength(0);
  });

  it("대체 문장이 그 자리를 채우지 않는다 (001 FR-024)", async () => {
    const kv = new InMemoryKeyValueStore();
    await runGenerateFlow(depsFor(new Repository(kv), emptyReaders, engineOf({ count: 0 })));

    expect(JSON.stringify([...kv.snapshot()])).not.toMatch(/주인은|하루|일기/);
  });
});

describe("시나리오 3b — 시각 무제약 (001 FR-042, SC-013)", () => {
  const hours = ["00:10", "05:30", "09:00", "14:00", "23:50"];

  it.each(hours)("%s에도 생성이 시각을 이유로 거부되지 않는다", async (hhmm) => {
    const repo = new Repository(new InMemoryKeyValueStore());
    const outcome = await runGenerateFlow(
      depsFor(repo, richReaders, engineOf({ count: 0 }), new Date(`${DATE}T${hhmm}:00+09:00`)),
    );

    expect(outcome.kind).toBe("completed");
  });

  it("잠정·미완 상태로 구별해 표시하지 않는다 (001 FR-042)", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await runGenerateFlow(
      depsFor(repo, richReaders, engineOf({ count: 0 }), new Date(`${DATE}T05:30:00+09:00`)),
    );

    const bundle = await repo.findByDate(DATE);
    // 이른 아침의 기록도 다른 기록과 같은 형태다 — 잠정 표시가 붙는 자리가 없다.
    expect(Object.keys(bundle!).sort()).toEqual(["diary", "digest", "visibility"]);
  });
});

describe("시나리오 4 — 덮어쓰기와 재생성 (001 AS-4·AS-5, SC-008·SC-011)", () => {
  it("확인 없이 덮어쓰지 않는다 (001 FR-040)", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await runGenerateFlow(depsFor(repo, richReaders, engineOf({ count: 0 }, "첫 번째다.")));

    const asked: ConfirmKind[] = [];
    const outcome = await runGenerateFlow({
      ...depsFor(repo, richReaders, engineOf({ count: 0 }, "두 번째다.")),
      confirmer: {
        confirm: async (kind) => {
          asked.push(kind);
          return false;
        },
      },
    });

    expect(asked).toContain(ConfirmKind.Overwrite);
    expect(outcome.kind).toBe("cancelled");
    expect((await repo.findByDate(DATE))?.diary.body).toBe("첫 번째다.");
  });

  it("그 날짜에 보이는 일기가 최대 한 편이다 (001 SC-008)", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await runGenerateFlow(depsFor(repo, richReaders, engineOf({ count: 0 }, "첫 번째다.")));
    await runGenerateFlow(depsFor(repo, richReaders, engineOf({ count: 0 }, "두 번째다.")));

    const list = await repo.listVisible();
    expect(list.filter((b) => b.diary.date === DATE)).toHaveLength(1);
  });

  it("두 번째 일기가 두 번째 집계와 짝지어져 있다 (001 SC-011)", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());

    const morning = new Date(`${DATE}T09:00:00+09:00`);
    const night = new Date(`${DATE}T22:00:00+09:00`);

    await runGenerateFlow(
      depsFor(repo, richReaders, engineOf({ count: 0 }, "아침에 쓴 것이다."), morning),
    );
    const firstObservedAt = (await repo.findByDate(DATE))!.digest.observedAt;

    await runGenerateFlow(
      depsFor(repo, richReaders, engineOf({ count: 0 }, "밤에 쓴 것이다."), night),
    );
    const second = (await repo.findByDate(DATE))!;

    expect(second.diary.body).toBe("밤에 쓴 것이다.");
    // 첫 번째 집계가 두 번째 일기에 남아 있는 경우가 없다.
    expect(second.digest.observedAt).toBe(night.toISOString());
    expect(second.digest.observedAt).not.toBe(firstObservedAt);
  });

  it("재생성 시 집계를 새로 만든다 — 이전 집계를 재사용하지 않는다 (001 FR-040a, 003 FR-263)", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await runGenerateFlow(depsFor(repo, richReaders, engineOf({ count: 0 }, "첫 번째다.")));

    // 두 번째에는 관측이 줄어든다 — 이전 값으로 메우지 않는다 (003 FR-264).
    const leaner: SourceReaders = {
      ...richReaders,
      photo: async () => ({ photos: unobserved() }),
      calendar: async () => ({ events: unobserved() }),
    };
    await runGenerateFlow(depsFor(repo, leaner, engineOf({ count: 0 }, "두 번째다.")));

    const bundle = (await repo.findByDate(DATE))!;
    expect(bundle.digest.photos).toEqual(unobserved());
    expect(bundle.digest.events).toEqual(unobserved());
  });
});
