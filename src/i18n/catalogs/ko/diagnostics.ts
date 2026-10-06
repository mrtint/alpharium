/**
 * 한국어 카탈로그 — 진단 화면 (062, 원래 자리 `src/app/diagnostics-text.ts` 060 — 보드 `6h`·`6k` 문구표 `diag.*` 원문).
 *
 * 문장 틀(`{n}`·`{k}`)은 함수로 둔다(`toLocaleString` 금지 — 숫자 서식이 기기 로케일에 흔들린다). 「보드 밖」 표시는 원래 자리의
 * 주석 그대로다. 모델 이름·파라미터 수·양자화 표기는 어디에도 두지 않는다(원칙 III). 개발 빌드 전용 화면도 카탈로그로 옮겼다
 * (062 Clarification Q4).
 */

export const diagnostics = {
  title: "진단",
  env: "환경",
  build: "빌드",
  device: "기기",
  inference: "추론 위치",
  inferenceCpu: "기기 · CPU",
  storage: "저장 점검",
  storageOk: (n: number): string => `${n}편 · 정상`,
  storageBad: (n: number, k: number): string => `${n}편 · ${k}편 읽기 실패`,
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

  // ── 보드 밖 (060 clarify·plan이 채움) ──
  /** 쓰기 실패의 다섯째 갈래 — 앞 넷에 안 맞는 실패(시간 초과·중단·판정 거부 등)를 사실과 다른 이유로 뭉치지 않으려고 더했다 */
  failUnwritten: "일기를 쓰지 못함",
  autoRan: "썼음",
  autoSkipped: "건너뜀",
  autoFailed: "실패",
  autoRunning: "도는 중…",
  failuresEmpty: "아직 실패가 없어요",
  /** 신호 칸 — 관측된 0 */
  none: "없음",
  /** 추론 위치 — 로컬 서버(데스크톱 개발 환경) */
  inferenceServer: "로컬 서버",
  /** 추론 위치 — 고르지 못함 */
  inferenceNone: "선택되지 않음",
  /** 프롬프트 미리보기 크기 줄의 설명 — 실측이 아님을 밝힌다(022 PP6) */
  sizeNote: "조립 시점 근사치, 실측 토큰 아님",
  /** 프롬프트 미리보기를 조립하지 못했을 때 — 이유를 그대로 보인다(원칙 I: 실패가 텍스트를 반환하지 않는다) */
  previewFailed: (reason: string): string => `조립할 수 없음: ${reason}`,

  // ── 062 — 칸·줄 조각 (원래 자리 `src/app/diagnostics-view.ts`·`src/ui/DiagnosticsParts.tsx`) ──
  /** 신호 칸 — 사진 수 */
  photoCount: (n: number): string => `${n}장`,
  /** 신호 칸 — 그날 사진 일부만 읽었을 때 */
  photoCountPartial: (n: number): string => `${n}장 (일부)`,
  /** 신호 칸 — 장소 수 */
  placeCount: (n: number): string => `${n}곳`,
  /** 실패 줄의 시각 — 현지 「M월 d일 HH:MM」 한 가지 형식 */
  failureTime: (month: number, date: number, hhmm: string): string =>
    `${month}월 ${date}일 ${hhmm}`,
  /** 프롬프트 미리보기 크기 줄 — 「1234자 (조립 시점 근사치, 실측 토큰 아님)」 */
  approxChars: (n: number, note: string): string => `${n}자 (${note})`,
};

/**
 * 진단 「환경」 묶음의 언어 줄 (062 FR-011b, contracts V1). 이 작업이 새로 더한 유일한 화면 문구다.
 * 「감지한 첫 태그 → 고른 언어 이름」. 감지하지 못했으면 태그 자리에 `unknown`. 고른 언어는 곧 이 카탈로그의 언어라
 * 이름은 카탈로그마다 자기 이름 하나(`selfName`)만 둔다.
 */
export const diagnosticsLanguage = {
  label: "언어",
  unknown: "모름",
  /** 이 카탈로그의 언어 이름 */
  selfName: "한국어",
  line: (detected: string, chosen: string): string => `${detected} → ${chosen}`,
};
