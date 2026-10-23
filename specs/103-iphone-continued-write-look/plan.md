# Implementation Plan: iPhone 이어 하기가 보이는 모습

**Branch**: `103-iphone-continued-write-look` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: `specs/103-iphone-continued-write-look/spec.md`, 설계 `docs/superpowers/specs/2026-10-23-iphone-continued-write-look-design.md`

## Summary

세 갈래다. ① `src/app/continued-write.ts`의 단계 안 위치 계산을 쌍곡선(`시작 + 몫 × w/(w+k)`)으로 바꾸고 박동 무게·반몫 상수를 단위 모의와 iPhone 14 실기기 회차로 정한다(토큰 비율만 줄이는 첫 안은 1회차 실측에서 효과가 없었다 — research R6). ② 코드 없이 AGENTS 한 줄. ③ `all-written` 의문을 소스 조사와 기기 재현으로 닫는다. 새 화면 문구·새 파일 없음(테스트 제외).

## Technical Context

**Language/Version**: TypeScript(RN 0.86, Expo SDK 57), iOS 네이티브 모듈은 건드리지 않음

**Primary Dependencies**: 기존 것만. 새 의존성 없음

**Storage**: 해당 없음(막대 값은 밖으로 나가 표시에만 쓰이고 저장하지 않는다 — 092)

**Testing**: jest `logic` 프로젝트(`__tests__/app/continued-write.test.ts` 확장), 소스 계약 `app-continued-write-source.test.ts`

**Target Platform**: iOS 26+(`BGContinuedProcessingTask`). iPhone 14 실기기 Release(개발 환경)

**Project Type**: 모바일 앱

**Performance Goals**: 해당 없음. 막대 보고 간격(2초)은 그대로

**Constraints**: 보고마다 한 칸 이상 오름, 전체 1,000,000칸, 95% 상한, 타이머 금지, 박동은 종류뿐. `src/i18n/catalogs/ko/` 무변경

**Scale/Scope**: 계산 함수 하나와 상수 몇 개, 테스트 몇 개, 문서 몇 줄

## Constitution Check

| 원칙 | 판정 | 근거 |
|------|------|------|
| I 온디바이스 | 해당 없음 | 추론 경로 무변경 |
| II 화자 | 해당 없음 | 일기 문구 무변경 |
| III 로스터 | 해당 없음 | 모델·페르소나 무변경 |
| IV 측정 장치 | **통과** | 진행 막대는 UX 예외(헌법 원칙 IV 셋째 항목). 박동은 종류뿐이고 토큰·글을 싣지 않는다. 무게·반몫 선택용 모의는 `__tests__`/문서에만 두고 제품 코드에 채점·측정을 넣지 않는다 |
| V 사실/추측 | **통과** | 무게·반몫은 「사람이 정한 값」으로 표기하고 실측 회차와 모의로 정한 근거를 quickstart에 적는다. 실기기 1회 이상이 완료 조건 |
| 개발 방식 | 통과 | 테스트 먼저, 한국어 커밋, 기능 브랜치 |

설계 후 재평가: 통과(변경 없음).

## Project Structure

### Documentation

```text
specs/103-iphone-continued-write-look/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md · tasks.md
├── contracts/progress-bar.md       # 막대 계산 계약 PB1~PB6
└── checklists/requirements.md
```

### Source Code

```text
src/app/continued-write.ts                       # 박동 무게·반몫과 위치 계산 (+ 주석)
__tests__/app/continued-write.test.ts            # 새 공식 단언·시뮬레이션 (기존 정확값 단언 갱신)
__tests__/app/app-continued-write-source.test.ts # 필요하면 소스 계약 맞춤
AGENTS.md                                        # 「iPhone 이어 하기(092)」 남은 위험 고쳐 쓰기
docs/roadmap/README.md                           # 완료 처리 시
```

(③이 작은 버그로 판명되면 `src/schedule/`·`src/app/` 중 한 파일이 더해질 수 있다 — spec Clarifications.)

## 단계

1. **모의(완료)**: 지수 감쇠 표(R1)와 1회차 실측(R6)으로 토큰 비율만으로는 안 됨을 확인했고 쌍곡선 후보 값을 모의했다(R7). 제품 코드에 두지 않는다.
2. **테스트 먼저**: PB2~PB4를 단위 테스트로 쓰고 옛 공식으로 되돌리는 위반 주입으로 잡히는지 본다.
3. **공식 변경**: 위치 계산을 쌍곡선으로 바꾸고 주석에 근거·「사람이 정한 값」을 적는다. 기존 정확값 단언을 새 값으로 갱신한다.
4. **실기기 회차**: 개발 환경 Release 빌드로 이어 하기(충전 1회 이상 + 충전 없음 1회 이상, quickstart). 102 세션에 점유를 알렸다.
5. **③ 조사·재현**, **AGENTS 고쳐 쓰기**.
6. **회차 결과로 상수 확정**: stall 종료가 나거나 후반이 안 오르면 상수를 다시 정해 반복한다.

## 위험

- 쌍곡선도 끝 위치가 쓰기마다 다르다(k=1000 모의: 77~89%) — 끝나기 전 막대가 100%에 닿지 않고 `finish`가 가득 채운다. 위치는 사람이 정한 짐작이다(원칙 V — 표기).
- 총 토큰 수와 속도를 앱이 모르므로 무게·반몫은 한 기기·한 모델·한 날(1회차 약 3000토큰) 표본에 맞춘 값이다.
- 프롬프트 토막 박동이 글 단계 초반에 몰린다(1회차: 30초에 11개 안팎) — 조각 무게를 4로 두어 초반이 몫의 4%에 머물도록 했다. 초반이 너무 정지해 보이는지는 실기기에서 본다.
