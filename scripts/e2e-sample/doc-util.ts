/** Commons 파일 페이지 URL에서 사람이 읽는 파일 이름을 뽑는다 (`File:` 뒤, 밑줄은 공백, 퍼센트 부호 해제) */
export function urlToTitle(sourcePage: string): string {
  const raw = sourcePage.split("File:")[1] ?? sourcePage;
  try {
    return decodeURIComponent(raw).replace(/_/g, " ").replace(/\|/g, "/");
  } catch {
    return raw.replace(/_/g, " ").replace(/\|/g, "/");
  }
}
