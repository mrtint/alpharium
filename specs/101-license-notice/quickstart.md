# Quickstart: 모델·오픈소스 라이선스 고지 검증

## 1. 기기 불필요 (항상)

```bash
npx jest __tests__/privacy __tests__/i18n/license-links.test.ts --selectProjects logic
npx jest __tests__/ui/settings-license-row.test.tsx __tests__/ui/settings-policy-rows.test.tsx --selectProjects ui
npm test
npm run lint
```

기대: 모두 통과. 헌법 파일(`.specify/memory/constitution.md`)과 `scripts/constitution-rules.ts`의 diff가 0줄(SC-004).

## 2. 위반 주입 (새 규칙마다 실제로 어겨 본다)

각 주입은 치환이 적용됐는지 먼저 확인하고, 테스트가 실패하는지 본 뒤 되돌린다.

| 주입 | 잡아야 하는 계약 |
|------|------------------|
| `licenseLinks.row`에 "Kanana 라이선스" | LK2 |
| 페이지 `lfm` 전문의 한 글자 바꿈 | LP5 |
| `data-license="llama-rn"` 항목 삭제 | LP3 |
| `llama-cpp-LICENSE.txt`를 상류 "2023-2026"으로 | LP6 |
| 페이지에 `<script>` 추가 | LP2 / S3 |
| `App.tsx`의 `LICENSES_URL`을 하드코딩 문자열로 | LR3 / L5 |

## 3. 실기기 (dev 빌드, 최소 1회 — 원칙 V)

> 병렬 실측 세션이 SM-S901N과 iOS 시뮬레이터를 쓴다. **이 세션은 그 세션과 겹치지 않게 소유자에게 먼저 알린 뒤 쓴다.**

1. 사이트가 배포돼 있어야 한다(`site/licenses/`가 `main`에 머지돼 Pages가 나간 뒤) — 배포 전이면 기기의 브라우저가 404를 보이므로 행 동작만 확인하고 페이지 확인은 로컬 파일/서버로 갈음하되 그 사실을 보고한다.
2. 설정 → 「정보」 → 「오픈소스 라이선스」를 누른다 → 브라우저에서 고지 페이지가 열린다(설정을 연 뒤 행 한 번 누름, SC-002).
3. 페이지에서 항목 넷과 전문을 눈으로 확인한다. 글꼴 2.0배에서 행 이름이 잘리지 않는다.
4. 비행기 모드에서 누르면 행 아래에 실패 한 줄과 주소가 보이고, 연결 후 다시 누르면 사라진다.

## 4. 소유자가 읽는 것

- H1·H2: `sources/lfm-LICENSE.txt` 1절·4절·5절
- H3: `sources/kanana-LICENSE.txt` (Apache 2.0)와 Kakao 원 저장소의 저작권 표기
- H4: `research.md` R3의 서드파티 다섯 블록

## 5. 실측 (2026-10-22)

### 위반 주입 (치환 적용을 먼저 확인했고, 모두 되돌렸다)

| 주입 | 결과 |
|------|------|
| `licenseLinks.row` = 「Kanana 라이선스」 | LK1·LK2(kanana)·LK2(소스) 실패 |
| `lfm` 전문 한 글자(`Liquid AI, Inc.` → `Liquid AI Inc.`) | LP5 실패 |
| `data-license="llama-rn"` 제거 | LP3·LP4·LP5 실패 |
| `sources/llama-cpp-LICENSE.txt` 연도를 상류 2023-2026으로 | LP6·LP5·LP7 실패 |
| 페이지에 `<script>` 추가 | LP2 + 사이트 계약(S3)·089 하드코딩 계약 3건 실패 |
| `App.tsx`가 주소를 하드코딩 | LR3·LR6 실패 |

### 명령

- 주입 후 복구: `npx jest __tests__/privacy __tests__/i18n/license-links.test.ts --selectProjects logic` 86 통과.
- `npm run lint`: eslint 오류 0(경고 2건은 이 과제와 무관한 기존 파일), `tsc` 0, 헌법 검사 「위반 0건」, `format:check` 통과.

### 실기기 (SM-S901N, dev 번들, 2026-10-22)

- Metro를 이 워크트리에서 8083으로 띄우고(8081은 메인 체크아웃의 다른 Metro가 쓰고 있어 건드리지 않음) 앱의 `debug_http_host`를 `localhost:8083`으로 잠시 바꿨다(`run-as`로 shared_prefs만, 앱 재설치·`pm clear` 없음 — 모델 그대로). 끝나고 prefs 파일·`adb reverse`(8083·8085)·Metro·로컬 서버를 모두 정리했고 `tcp:8081`은 그대로다.
- 설정 → 「정보」: 버전 → 개인정보처리방침 → 도움말·문의 → 서체 라이선스 → **오픈소스 라이선스** → 개발자 순으로 보였다(LR1).
- 행을 한 번 누르자 크롬이 `mrtint.github.io/alpharium/licenses/`를 열었다. **사이트가 아직 배포되지 않아 GitHub Pages 404가 보였다**(예상된 결과 — 머지 뒤 배포).
- 같은 페이지를 로컬 서버(`127.0.0.1:8085`)로 휴대폰 크롬에서 열어 제목·항목 머리·Apache 전문이 폰 폭에서 줄바꿈되며 읽히는 것을 확인했다(원문 자체의 `&lt;<http://…>&gt;` 표기도 그대로 보임).
- **미확인**: 글꼴 2.0배에서 행 이름, 비행기 모드의 실패 한 줄, iOS 실기기, 배포된 실제 주소의 페이지.
