# Implementation Plan: iPhone 이어 하기가 보이는 모습

**Branch**: `103-iphone-continued-write-look` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: `specs/103-iphone-continued-write-look/spec.md`, 설계 `docs/superpowers/specs/2026-10-23-iphone-continued-write-look-design.md`

## Summary

세 갈래다. ① `src/app/continued-write.ts`의 토큰 비율 상수 하나를 줄이고 단위 모의와 iPhone 14 실기기 회차로 값을 정한다. ② 코드 없이 AGENTS 한 줄. ③ `all-written` 의문을 소스 조사와 기기 재현으로 닫는다. 새 화면 문구·새 파일 없음(테스트 제외).

## Technical Context

**Language/Version**: TypeScript(RN 0.86, Expo SDK 57), iOS 네이티브 모듈은 건드리지 않음

**Primary Dependencies**: 기존 것만. 새 의존성 없음

**Storage**: 해당 없음(막대 값은 밖으로 나가 표시에만 쓰이고 저장하지 않는다 — 092)

**Testing**: jest `logic` 프로젝트(`__tests__/app/continued-write.test.ts` 확장), 소스 계약 `app-continued-write-source.test.ts`

**Target Platform**: iOS 26+(`BGContinuedProcessingTask`). iPhone 14 실기기 Release(개발 환경)

**Project Type**: 모바일 앱

**Performance Goals**: 해당 없음. 막대 보고 간격(2초)은 그대로

**Constraints**: 보고마다 한 칸 이상 오름, 전체 1,000,000칸, 95% 상한, 타이머 금지, 박동은 종류뿐. `src/i18n/catalogs/ko/` 무변경

**Scale/Scope**: 상수 1, 테스트 몇 개, 문서 몇 줄

## Constitution Check

| 원칙 | 판정 | 근거 |
|------|------|------|
| I 온디바이스 | 해당 없음 | 추론 경로 무변경 |
| II 화자 | 해당 없음 | 일기 문구 무변경 |
| III 로스터 | 해당 없음 | 모델·페르소나 무변경 |
| IV 측정 장치 | **통과** | 진행 막대는 UX 예외(헌법 원칙 IV 셋째 항목). 박동은 종류뿐이고 토큰·글을 싣지 않는다. 비율 선택용 모의는 `__tests__`/문서에만 두고 제품 코드에 채점·측정을 넣지 않는다 |
| V 사실/추측 | **통과** | 새 비율은 「사람이 정한 값」으로 표기하고 실측 회차와 모의로 정한 근거를 quickstart에 적는다. 실기기 1회 이상이 완료 조건 |
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
src/app/continued-write.ts                       # BEAT_SHARE.token (+ 주석)
__tests__/app/continued-write.test.ts            # 새 비율 단언·시뮬레이션 (기존 1/400 단언 갱신)
__tests__/app/app-continued-write-source.test.ts # 필요하면 소스 계약 맞춤
AGENTS.md                                        # 「iPhone 이어 하기(092)」 남은 위험 고쳐 쓰기
docs/roadmap/README.md                           # 완료 처리 시
```

(③이 작은 버그로 판명되면 `src/schedule/`·`src/app/` 중 한 파일이 더해질 수 있다 — spec Clarifications.)

## 단계

1. **비율 선택 도구**: 박동열 모의(순수 함수 계산)로 토큰 비율별 90%·949k에 닿는 토큰 수를 표로 만든다(research R1). 제품 코드에 두지 않는다.
2. **테스트 먼저**: PB1~PB6을 단위 테스트로 쓰고 위반 주입으로 잡히는지 본다.
3. **상수 변경**: 후보 1/1600 안팎으로 바꾸고 주석을 고친다.
4. **실기기 회차**: 개발 환경 Release 빌드로 이어 하기 1회 이상(quickstart). 102 세션에 시작 전 알린다.
5. **③ 조사·재현**, **AGENTS 고쳐 쓰기**.
6. **회차 결과로 비율 확정**: stall 종료가 나면 비율을 다시 정해 반복한다.

## 위험

- **토큰 비율만으로는 모양이 거의 안 바뀐다**(research R1): 조각 박동이 토큰 32개당 한 번 남은 몫의 1/16을 가져가 토큰당 감쇠율의 약 45%를 이미 차지한다. 토큰 비율을 0으로 해도 정체 시작은 2.2배까지만 늦어진다. 그 안에서 실제 토큰 수에 맞추는 것이 이 과제의 몫이고, 모자라면 소유자에게 조각 비율 변경 허가를 다시 묻는다(스펙 FR-002는 조각 비율 불변).
- 실제 토큰 수를 앱이 모르므로 비율은 한 기기·한 모델·한 날의 표본에 맞춘 값이다(원칙 V — 짐작임을 표기).
