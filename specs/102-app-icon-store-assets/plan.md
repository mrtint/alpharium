# Implementation Plan: 앱 아이콘과 스토어 등록 에셋

**Branch**: `102-app-icon-store-assets` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: `specs/102-app-icon-store-assets/spec.md`, 설계 `docs/superpowers/specs/2026-10-23-app-icon-store-assets-design.md`

## Summary

아이콘은 `design/icon.json` 하나(마크 도형·플랫폼별 배율, 색은 `design/tokens.json`을 가리킴)에서 `scripts/design/build-icons.mts`가 PNG와 SVG 미리보기를 생성한다(089 토큰 생성기와 같은 방식 — 정본→생성물, `--check`). 생성물이 정본과 어긋나거나 손으로 고쳐지면 계약 테스트가 잡는다. `app.json`은 `ios.supportsTablet`을 `false`로, 안드로이드 adaptive 배경을 accent 빨강으로 맞춘다. 등록 에셋은 새 최상위 폴더 `store/ko/`에 둔다(설명문 텍스트 파일 5개, 스크린샷, 기능 그래픽, 스토어 아이콘). 스크린샷은 실기기에서 실제 일기를 쓴 화면을 찍어 두고, iOS는 `sips`로 비율 그대로 1284×2778로 확대한다. 앱 코드·카탈로그·`site/`는 건드리지 않는다.

## Technical Context

**Language/Version**: TypeScript(Node `--experimental-strip-types`로 `.mts` 실행 — `scripts/design/`과 같은 방식), JSON, 텍스트

**Primary Dependencies**: `pngjs`(PNG 읽기·쓰기)를 devDependency로 올린다. 지금은 다른 패키지의 간접 의존(3.4.0)으로만 있어 최상위로 명시한다. SVG 렌더러는 들이지 않는다 — 마크가 직선·반원뿐이라 해석적 도형 판정으로 직접 그린다(research R1)

**Storage**: 파일(`assets/`, `store/ko/`, `design/icon.json`)

**Testing**: jest `logic`(`.ts`, node 환경) — `__tests__/design/icons.test.ts`, `__tests__/store/listing.test.ts`, `__tests__/store/assets.test.ts`, 설정 계약 `__tests__/config/ios-tablet.test.ts`. 위반 주입으로 각 규칙을 검증한다

**Target Platform**: Android(SM-S901N) / iOS(iPhone 14) 런처, App Store Connect(iPhone 6.5형)·Google Play Console 업로드용 파일

**Project Type**: 모바일 앱 + 에셋·설명문 모음(앱 소스 변경 거의 없음)

**Performance Goals**: 해당 없음. 생성기는 PNG 1024² 몇 장이라 수 초

**Constraints**: `src/i18n/catalogs/ko/`·`site/`·`src/inference/`·`modules/pocketlog-continued-write/`·화면 문구 불변(FR-014). 앱 코드 변경 없음. 디자인 시스템의 그림자·그라데이션·둥근 모서리 금지. 모델 식별자 금지(원칙 III). 합성 데이터 금지(원칙 V). 아이콘 PNG를 바꾸면 안드로이드·iOS prebuild를 다시 돌려야 런처에 반영된다(시안 실측)

**Scale/Scope**: 정본 1, 생성 스크립트 1(+코어), 아이콘 PNG 6(iOS 1·안드로이드 3·favicon 1·스토어 512 1), 기능 그래픽 1, 스크린샷 두 묶음(iOS 5장·Play 4장 이상), 설명문 5, 테스트 파일 약 4

## Constitution Check

*GATE — 설계 전과 후 모두 통과.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 해당 없음 | 추론 경로를 건드리지 않는다 |
| II 화자는 휴대폰 | 통과 | 설명문이 일기의 화자를 사람이 쓴 것처럼 서술하지 않는다(설명문 검토 항목) |
| III 모델 식별자 비노출 | **게이트** | 스크린샷·설명문·기능 그래픽에 모델 이름·파라미터 수·양자화를 쓰지 않는다. 설명문은 금지어 테스트(FR-012)로 잠근다. 스크린샷 안 앱 화면은 모델 이름을 이미 노출하지 않는다 |
| IV 측정 장치 | 통과 | 모델 출력 채점·비교 코드가 없다. 생성기·테스트는 아이콘·에셋 검증뿐 |
| V 관측과 추측 구분 | **게이트** | 스크린샷은 실기기에서 실제 일기를 쓴 화면(FR-008). iPad는 시뮬레이터 점검임을 기록에 밝힌다(FR-006). iOS 런처 확인은 못 했으면 못 했다고 적는다(FR-015). 스토어 규격은 제출 시점 콘솔에서 다시 대조한다(FR-010) |

위반 없음 — Complexity Tracking 비움. 설계 후 재평가도 같다.

## Project Structure

### Documentation (this feature)

```text
specs/102-app-icon-store-assets/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── icon-source.md      # design/icon.json 계약·생성물 규칙
│   └── store-assets.md     # store/ko/ 파일 구성·규격·검증
└── tasks.md                # /speckit-tasks 산출
```

### Source Code (repository root)

```text
design/
├── icon.json                        # 신규: 아이콘 정본(도형·배율)
└── DESIGN.md                        # 「아이콘」 절 추가(한 단락)
scripts/design/
├── icon-build.ts                    # 신규: 순수 코어(도형 판정·래스터화·SVG 문자열)
└── build-icons.mts                  # 신규: 정본→assets/·store/ko/·design/icon.svg 쓰기, --check
assets/
├── icon.png, android-icon-{foreground,background,monochrome}.png, favicon.png   # 생성물로 교체
design/icon.svg                      # 신규: 생성물(미리보기)
store/ko/
├── title.txt, subtitle.txt, short.txt, full.txt, keywords.txt                   # 신규: 설명문
├── store-icon-512.png, feature-graphic-1024x500.png                             # 신규: 생성물
└── screenshots/{ios-6.5,play-phone}/NN-*.png                                    # 신규: 실기기 촬영
app.json                             # supportsTablet false, adaptive 배경
package.json, package-lock.json      # pngjs devDependency, build:icons 스크립트(T001·T005)
AGENTS.md                            # 아이콘·등록 에셋 한 줄과 실측 규칙 두 줄(T024)
docs/roadmap/README.md               # 완료 처리(T025)
__tests__/design/icons.test.ts       # 신규
__tests__/config/ios-tablet.test.ts  # 신규
__tests__/store/{listing,assets}.test.ts   # 신규
specs/102-app-icon-store-assets/ipad-compat.md   # 구현 중 생성: iPad 시뮬레이터 점검 기록
specs/102-app-icon-store-assets/device-check.md  # 구현 중 생성: 실기기 확인·콘솔 규격 대조·사진 확인 기록
```

**Structure Decision**: 정본→생성물→계약 테스트의 089 패턴을 아이콘에 그대로 쓴다. 등록 에셋은 앱 번들에 들어가지 않으므로 `store/`에 두어 `assets/`(앱 번들)와 섞지 않는다.

## Complexity Tracking

위반 없음.
