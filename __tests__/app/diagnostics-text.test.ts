/**
 * 진단 화면 문구 계약 (060, DT1~DT4).
 *
 * 분해 설계 §3.6 「문구」 표의 KO 원문과 글자 단위로 같아야 한다(047 — 「디자인을 참조했다」는 「같다」가 아니다).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DIAGNOSTICS_TEXT as T } from "../../src/app/diagnostics-text";

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
