/**
 * 069 — Maestro JUnit 보고서에서 실패한 흐름 이름을 모은다 (순수 함수).
 *
 * **자기 닫힘 `<testcase .../>`를 건너뛰어야 한다.** `<testcase`부터 `<failure`까지를 한 번에 잡는 정규식은 통과한 흐름의 자기 닫힘 태그에서 시작해
 * 다음 흐름의 `<failure`까지 먹어 버려 실패한 흐름 이름이 통과한 흐름으로 보고된다(2026-10-10 실측: 통과한 `dialog-foundation`이 실패 목록에 올랐다).
 */
export function failedFlowNames(xml: string): string[] {
  const names: string[] = [];
  for (const match of xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
    const body = match[2];
    if (body === undefined || !/<failure\b/.test(body)) continue;
    const name = /\bname="([^"]*)"/.exec(match[1]);
    if (name !== null) names.push(name[1]);
  }
  return names;
}
