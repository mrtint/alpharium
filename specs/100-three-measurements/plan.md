# Implementation Plan: 실측 세 가지

**Branch**: `100-three-measurements` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: `specs/100-three-measurements/spec.md`. 설계 원본: `docs/superpowers/specs/2026-10-22-three-measurements-design.md`.

## Summary

코드 0줄로 세 가지를 먼저 잰다. (1) 제목 구간 길이(SM-S901N, 사진 있는 날·없는 날 각 2회), (2) OS 「동작 줄이기」에서 일곱 장면이 따라오는지(안드로이드 「애니메이션 제거」·iOS 시뮬레이터), (3) 쓴 날 첫 화면 본문 노출 줄 수(083 캡처 + SE급 시뮬레이터). 각각 「닫음」/「후속 변경」으로 판정해 `quickstart.md`에 원값을, AGENTS 실측 규칙에 한 줄씩 남긴다. 후속 변경은 판정이 가를 때만 열리며 그 범위는 스펙 FR-004·FR-007·FR-010이 정한다(제목 단계+풀, 슬라이드 자동 넘김 끄기, 보드 이탈 보고).

## Technical Context

**Language/Version**: TypeScript(RN 0.86, Expo SDK 57). 측정 단계는 코드 변경 없음.

**Primary Dependencies**: react-native-reanimated 4.5.1, react-native-reanimated-carousel 5.1.1(소스에서 reduceMotion 참조 없음 — 짐작, 이번에 실측).

**Storage**: N/A. 기기 설정 전후 값은 quickstart에 적는다.

**Testing**: 측정 단계는 테스트 없음. 후속 변경이 열리면 TDD(jest `logic`/`ui`)와 실기기 1회.

**Target Platform**: SM-S901N(Android, dev 빌드), iOS 시뮬레이터(iPhone 18 Pro 부팅됨, SE 3rd gen은 새로 생성).

**Project Type**: mobile-app.

**Constraints**: 측정 도구를 저장소에 두지 않는다(IV). 기기 설정·앱 데이터 보존(모델 ~2GB). Metro 8082 + `adb reverse tcp:8081 tcp:8082`, 종료 시 원복.

**Scale/Scope**: 측정 3건, 후속 변경은 조건부(최대 코드 3곳).

## Constitution Check

| 원칙 | 판정 | 근거 |
| ---- | ---- | ---- |
| I·II·III | 해당 없음 | 추론·프롬프트·로스터 무변경 |
| IV 측정 장치 | **통과** | 시간 재기는 `adb logcat`·`screenrecord` 등 기기 밖 도구로. 제품 코드에 타이머·로그를 더하지 않는다. 후속 변경의 진행 단계·혼잣말 풀은 사용자 대기 안내 UX라 예외 조항에 든다 |
| V 사실과 추측 | **적용** | 소스 읽기로 안 것(autoplay가 계속 넘어갈 것, 두 라이브러리가 같은 설정값을 읽음)과 실측을 표에서 갈라 적는다. 시뮬레이터 하나의 한계도 적는다 |
| 개발 방식 | 적용 | 후속 변경은 테스트 먼저. 커밋 한국어 |

게이트 위반 없음. Post-design 재평가: 변동 없음.

## Project Structure

```text
specs/100-three-measurements/
├── plan.md  research.md  data-model.md  quickstart.md  tasks.md
├── contracts/measurement-contract.md
├── captures/            # 화면 녹화·캡처 (필요한 것만, 용량 작게)
└── checklists/requirements.md

AGENTS.md                      # 실측 규칙 한 줄씩 (판정)
docs/roadmap/README.md         # 완료 처리(3차 커밋)·후속 과제
(조건부) src/inference/types.ts · src/diary/monologue.ts · src/i18n/catalogs/ko/monologue.ts · src/ui/DownloadProgressScreen.tsx · 관련 테스트
```

**Structure Decision**: 산출물은 문서뿐이다. 코드는 판정이 「후속 변경」일 때만 위 조건부 파일에서 열린다.

## 진행 순서

1. 환경: Metro 8082·`adb reverse`, 기기 설정 기록, 제목 구간 신호원 확인(research R1).
2. UX-01 측정 → 판정(FR-003, 둘 중 하나라도 ≥4초).
3. UX-11 측정(안드로이드·iOS) → 판정, 자동 넘김이 멈추지 않으면 소유자 확인을 요청.
4. UX-12 083 이후 레이아웃 변경 확인 → (그대로면) 083 캡처 판독, (바뀌었으면) 현재 코드로 재촬영 → 새 환경 촬영 → 판정.
5. 후속 변경(해당 시) TDD + 실기기 1회.
6. AGENTS·quickstart 정리, 설정 원복 대조.
