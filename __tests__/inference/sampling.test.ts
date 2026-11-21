/**
 * 생성 샘플링 값 (122 FR-010).
 *
 * temperature·top_p는 옆 저장소 실측(terrarium EXP-015)으로 정했고, 나머지는 그대로다.
 */

import { SAMPLING } from "../../src/inference/sampling";

describe("122 — 샘플링", () => {
  test("temperature 0.60 · top_p 0.90 · top_k 40 · n_predict 512", () => {
    expect(SAMPLING).toEqual({ temperature: 0.6, top_p: 0.9, top_k: 40, n_predict: 512 });
  });
});
