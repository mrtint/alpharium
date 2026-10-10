import { failedFlowNames } from "../../scripts/layer1/junit";

/**
 * 069 — JUnit 보고서에서 실패한 흐름 이름 (2026-10-10 실측한 오보고의 재발 방지).
 */

const REPORT = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="Test Suite" tests="4" failures="2">
    <testcase id="a-pass" name="a-pass" classname="a-pass" time="51"/>
    <testcase id="b-fail" name="b-fail" classname="b-fail" time="41">
      <failure>Assertion is false</failure>
    </testcase>
    <testcase id="c-pass" name="c-pass" classname="c-pass" time="33"/>
    <testcase id="d-fail" name="d-fail" classname="d-fail" time="44">
      <failure>Assertion is false</failure>
    </testcase>
  </testsuite>
</testsuites>`;

describe("JUnit 실패 흐름 이름 (069)", () => {
  it("J1 — 통과한 자기 닫힘 흐름을 실패로 보고하지 않는다", () => {
    expect(failedFlowNames(REPORT)).toEqual(["b-fail", "d-fail"]);
  });

  it("J2 — 모두 통과면 빈 목록이다", () => {
    expect(failedFlowNames('<testcase id="x" name="x" time="1"/>')).toEqual([]);
  });

  it("J3 — 첫 흐름이 실패해도 잡는다", () => {
    expect(
      failedFlowNames(
        '<testcase name="first"><failure>x</failure></testcase><testcase name="ok"/>',
      ),
    ).toEqual(["first"]);
  });
});
