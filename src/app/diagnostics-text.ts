/**
 * 진단 화면 문구 (060, 보드 `6h`·`6k` — 분해 설계 §3.6 「문구」 표).
 *
 * 계약: specs/060-diagnostics-screen/contracts/diagnostics.md DT1~DT4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 보드 문구표(`diag.*`)의 KO 원문을 글자 단위로 옮긴 정본이다 — 계약 테스트가 글자 단위로 잠근다(047). 보드의 키 이름을 따르되
 * 문장 틀(`{n}`·`{k}`)은 함수로 둔다(`toLocaleString` 금지 — 숫자 서식은 기기 로케일에 흔들린다).
 *
 * **「보드 밖」으로 표시한 문구**는 보드 문구표에 없는 것을 이 조각이 채운 것이다(저장소 소유자 확인 대상). 모델 이름·파라미터 수·
 * 양자화 표기는 어디에도 두지 않는다(원칙 III).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const DIAGNOSTICS_TEXT = {
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
} as const;
