/**
 * 진단 화면 문구 계약 (060, DT1~DT4).
 *
 * 분해 설계 §3.6 「문구」 표의 KO 원문과 글자 단위로 같아야 한다(047 — 「디자인을 참조했다」는 「같다」가 아니다).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { DIAGNOSTICS_TEXT as T, FAILURE_TEXT as F } from "../../src/app/diagnostics-text";
import { ko } from "../../src/i18n/catalogs/ko";

describe("DT1 — 보드 문구표 원문", () => {
  it("고정 문구가 글자 단위로 같다", () => {
    expect({
      title: T.title,
      env: T.env,
      build: T.build,
      device: T.device,
      inference: T.inference,
      inferenceCpu: T.inferenceCpu,
      storage: T.storage,
      photoPerm: T.photoPerm,
      photoRead: T.photoRead,
      photoLocation: T.photoLocation,
      photoScope: T.photoScope,
      scopeAll: T.scopeAll,
      scopeSelected: T.scopeSelected,
      probe: T.probe,
      probeRefresh: T.probeRefresh,
      probePhotos: T.probePhotos,
      probePlaces: T.probePlaces,
      probeSteps: T.probeSteps,
      probeBattery: T.probeBattery,
      probeNetwork: T.probeNetwork,
      probeUnknown: T.probeUnknown,
      prompt: T.prompt,
      preset1: T.preset1,
      preset2: T.preset2,
      gen: T.gen,
      tryOnce: T.tryOnce,
      runAuto: T.runAuto,
      tryOnceToast: T.tryOnceToast,
      failures: T.failures,
      failModule: T.failModule,
      failPhotos: T.failPhotos,
      failEmpty: T.failEmpty,
      failSave: T.failSave,
    }).toEqual({
      title: "진단",
      env: "환경",
      build: "빌드",
      device: "기기",
      inference: "추론 위치",
      inferenceCpu: "기기 · CPU",
      storage: "저장 점검",
      photoPerm: "사진 권한",
      photoRead: "사진 읽기",
      photoLocation: "사진 위치 정보",
      photoScope: "범위",
      scopeAll: "전체",
      scopeSelected: "선택한 사진만",
      probe: "신호 프로브 · 오늘",
      probeRefresh: "다시 읽기",
      probePhotos: "사진",
      probePlaces: "장소",
      probeSteps: "걸음",
      probeBattery: "배터리",
      probeNetwork: "연결",
      probeUnknown: "모름",
      prompt: "입력 프롬프트 미리보기",
      preset1: "프리셋 1 · 신호 없음",
      preset2: "프리셋 2 · 사진 있음",
      gen: "생성",
      tryOnce: "지금 한 번 써 보기",
      runAuto: "자동 쓰기 지금 실행",
      tryOnceToast: "진단에서 쓰기를 시작했어요.",
      failures: "최근 실패",
      failModule: "모듈을 불러오지 못함",
      failPhotos: "사진을 읽지 못함",
      failEmpty: "글이 비어 있음",
      failSave: "저장하지 못함",
    });
  });
});

describe("DT2 — 보드 밖 문구", () => {
  it("보드 밖 문구가 글자 단위로 같고 소스에 「보드 밖」 구분 주석이 있다", () => {
    expect({
      failUnwritten: T.failUnwritten,
      autoRan: T.autoRan,
      autoSkipped: T.autoSkipped,
      autoFailed: T.autoFailed,
      autoRunning: T.autoRunning,
      failuresEmpty: T.failuresEmpty,
      none: T.none,
      inferenceServer: T.inferenceServer,
      inferenceNone: T.inferenceNone,
      sizeNote: T.sizeNote,
    }).toEqual({
      failUnwritten: "일기를 쓰지 못함",
      autoRan: "썼음",
      autoSkipped: "건너뜀",
      autoFailed: "실패",
      autoRunning: "도는 중…",
      failuresEmpty: "아직 실패가 없어요",
      none: "없음",
      inferenceServer: "로컬 서버",
      inferenceNone: "선택되지 않음",
      sizeNote: "조립 시점 근사치, 실측 토큰 아님",
    });

    const src = readFileSync(
      join(__dirname, "..", "..", "src", "app", "diagnostics-text.ts"),
      "utf8",
    );
    expect(src).toContain("보드 밖");
  });
});

describe("DT3 — 문장 틀", () => {
  it("조립 실패 문구는 이유를 그대로 보인다", () => {
    expect(T.previewFailed("x")).toBe("조립할 수 없음: x");
  });

  it("{n}편 · 정상 / {n}편 · {k}편 읽기 실패", () => {
    expect(T.storageOk(0)).toBe("0편 · 정상");
    expect(T.storageOk(41)).toBe("41편 · 정상");
    expect(T.storageBad(41, 2)).toBe("41편 · 2편 읽기 실패");
  });
});

describe("DT4 — 모델 이름·사양이 없다 (원칙 III)", () => {
  it("문구에 모델 식별자·파라미터 수·양자화 표기가 없다", () => {
    const all = JSON.stringify(
      Object.values(T).map((v) =>
        typeof v === "function" ? (v as (a: unknown, b: unknown) => string)(1, 1) : v,
      ),
    );
    expect(all).not.toMatch(/gguf|exaone|kanana|lfm|qwen|llama|[0-9.]+\s?b\b|q[0-9]_[a-z0-9]+/i);
  });
});

describe("081 — 쓰기 실패의 새 갈래 문구 (contracts/write-failure-reasons.md T1·T4·T5·T6)", () => {
  /** 보드에 없다 — 소유자가 승인한 안(2026-10-14)을 글자 단위로 박는다 */
  const NEW_TEXTS = [
    "지시문을 되뱉음",
    "다른 언어로 씀",
    "글을 끝맺지 못함",
    "시간 초과",
    "도중에 끊김",
    "생성 중 오류",
  ];

  const code = (file: string) =>
    readFileSync(join(__dirname, "..", "..", file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

  it("T1 — 여섯 문구가 글자 단위로 같다", () => {
    expect({ ...F }).toEqual({
      echo: "지시문을 되뱉음",
      language: "다른 언어로 씀",
      unfinished: "글을 끝맺지 못함",
      timedOut: "시간 초과",
      interrupted: "도중에 끊김",
      error: "생성 중 오류",
    });
  });

  it("T4 — 옛 영역의 키는 늘지 않았다(골든 G2가 키 짝을 잠근다) — fail로 시작하는 키는 여덟", () => {
    expect(
      Object.keys(ko.diagnostics)
        .filter((key) => key.startsWith("fail"))
        .sort(),
    ).toEqual(
      [
        "failEmpty",
        "failModule",
        "failPhotos",
        "failSave",
        "failUnwritten",
        "failureTime",
        "failures",
        "failuresEmpty",
      ].sort(),
    );
  });

  it("T4 — 문구에 숫자·모델 이름이 없다 (060 DT4, 원칙 III·IV)", () => {
    for (const text of NEW_TEXTS) {
      expect(text).not.toMatch(/[0-9]/);
      expect(text).not.toMatch(/kanana|exaone|gguf|llama|모델/i);
    }
  });

  it("T5 — 문구는 reasonText 안에서만 읽는다(모듈 최상단 평가 금지, 062 C4)", () => {
    const view = code("src/app/diagnostics-view.ts");
    const from = view.indexOf("function reasonText");
    const to = view.indexOf("export function failureLines");
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    const outside = view.slice(0, from) + view.slice(to);
    expect(view.slice(from, to)).toMatch(/\bF\.echo\b/);
    expect(outside).not.toMatch(/\bF\.\w/);
  });

  it("T6 — 새 문구는 「최근 실패」 묶음으로만 간다 (FR-009·SC-006)", () => {
    const readers = sourceFiles(join(__dirname, "..", "..", "src"))
      .filter((file) => /FAILURE_TEXT/.test(code(file)))
      .sort();
    expect(readers).toEqual(["src/app/diagnostics-text.ts", "src/app/diagnostics-view.ts"]);

    // `FAILURE_TEXT`를 거치지 않고 카탈로그의 그 영역을 직접 읽는 화면도 없다
    for (const file of sourceFiles(join(__dirname, "..", "..", "src", "ui"))) {
      expect(code(file)).not.toMatch(
        /\.failures\.(echo|language|unfinished|timedOut|interrupted|error)\b/,
      );
    }

    for (const file of [
      "src/app/failure-toast.ts",
      "src/schedule/notification-text.ts",
      "src/ui/DiaryHomeScreen.tsx",
    ]) {
      const source = code(file);
      for (const text of NEW_TEXTS) expect(source).not.toContain(text);
    }
  });
});

/** `src/` 아래의 .ts·.tsx를 저장소 기준 경로로 모은다 */
function sourceFiles(dir: string): string[] {
  const root = join(__dirname, "..", "..");
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name))
      out.push(
        full
          .slice(root.length + 1)
          .split("\\")
          .join("/"),
      );
  }
  return out;
}
