/**
 * T015 — 화자 판정기 (research.md 결정 1, 004 FR-345~FR-349)
 *
 * **순수 함수이며 `AIEngine` 구현체 밖에 있다** (헌법 원칙 III). 어댑터를 교체해도
 * 같은 판정이 적용되어야 하므로, 엔진 안에 두면 어댑터마다 판정이 갈린다.
 *
 * 판정 대상은 **「누가 말하고 있는가」뿐**이다 — 문장의 의미나 서술의 품질을 보지
 * 않는다 (004 FR-347). 위반 시 **고쳐서 저장하지 않는다** (004 FR-349): 이 함수는
 * 참·거짓과 무엇이 걸렸는지만 돌려주고, 본문을 손대지 않는다.
 *
 * **표지 목록은 비운 채 매개변수로 둔다.** 값은 T058이 실제 모델 출력을 모아 채운다
 * (004 FR-348). 목록이 비어 있어도 결정성·내용 비평가·교정 없음의 성질은 성립한다.
 */

export interface SpeakerMarkers {
  /** 사용자가 화자일 때만 성립하는 표현. 본문에 있으면 위반이다. */
  readonly userSpeakerMarkers: readonly string[];
  /** 휴대폰이 화자일 때 성립하는 표현. 참고용이며 판정을 뒤집지 않는다. */
  readonly phoneSpeakerMarkers: readonly string[];
}

/**
 * 실측 전의 표지 목록 — **비어 있다** (004 FR-348).
 *
 * T058이 quickstart 시나리오 8b에 따라 채운다. 채울 때는 **위음성**(사용자 화자인데
 * 통과)을 우선 없앤다 — 통과하면 001 FR-019가 깨진 채 지나간다. 위양성은 실패로
 * 표시되고 재시도 경로가 있으므로 회복 가능하다 (004 FR-354).
 */
export const EMPTY_MARKERS: SpeakerMarkers = Object.freeze({
  userSpeakerMarkers: Object.freeze([]),
  phoneSpeakerMarkers: Object.freeze([]),
});

export interface SpeakerVerdict {
  /** 화자가 휴대폰인가. 참·거짓뿐이다 (004 FR-349). */
  readonly isPhoneSpeaker: boolean;
  /** 걸린 위반 표지. 무엇이 걸렸는지 알릴 뿐 본문을 고치지 않는다. */
  readonly violatingMarkers: readonly string[];
}

/**
 * 본문의 화자를 판정한다. 같은 본문·같은 목록이면 항상 같은 결과다 (004 FR-346).
 * 본문을 돌려주지 않는다 — 교정 경로가 애초에 없다.
 */
export function verifySpeaker(body: string, markers: SpeakerMarkers): SpeakerVerdict {
  const violatingMarkers = markers.userSpeakerMarkers.filter((m) => body.includes(m));
  return {
    isPhoneSpeaker: violatingMarkers.length === 0,
    violatingMarkers,
  };
}
