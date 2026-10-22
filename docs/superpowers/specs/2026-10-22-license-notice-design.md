# 모델·오픈소스 라이선스 고지 — 설계 (스펙 101)

로드맵 「모델·오픈소스 라이선스 고지」의 설계문서. 2026-10-22 brainstorming에서 소유자와 확정했다.

## 목표

배포물에 들어가는 모델과 네이티브 라이브러리의 라이선스 고지를 의무대로 남긴다. **헌법은 고치지 않는다.**

## 확정한 결정

| 번호 | 결정 | 근거 |
|------|------|------|
| D6 | 고지는 **앱 밖 페이지**(`site/licenses/`)에 둔다 | 모델 이름이 앱 화면에 나오지 않아 헌법 원칙 III(모델 식별자 비노출)을 고칠 필요가 없고, 코드에 예외도 두지 않는다 |
| D7 | 앱의 진입점은 설정 「정보」의 **새 행 하나**다 | 눌러서 기기 브라우저로 연다(086 방침·지원 행 방식). 기존 행·문구는 건드리지 않는다. 행 이름에 모델명이 없다 |
| D8 | 범위는 **모델 + 네이티브 라이브러리**다 | JS/Expo 의존성은 범위 밖 |

## 고지 대상

| 항목 | 파일(출처) | 라이선스(1차 확인 전) | 저작권자 |
|------|-----------|----------------------|----------|
| 글 쓰는 모델 Kanana 1.5 2.1B | `src/models/roster.ts` — DevQuasar GGUF 재배포본 | Apache-2.0 | Kakao Corp. (원문 확인 필요) |
| 사진 읽는 모델 LFM2.5-VL 450M 본체 | `src/vision/roster.ts` — LiquidAI GGUF | LFM Open License v1.0 | Liquid AI, Inc. |
| 같은 모델의 mmproj | `src/vision/roster.ts` | 위와 같음 | 위와 같음 |
| llama.cpp / ggml | `llama.rn`에 번들 | MIT | The ggml authors |
| llama.rn | `package.json` | MIT | Jhen-Jie Hong |

모델 파일은 셋이지만 라이선스는 둘이다(LFM 본체와 mmproj가 하나).

## 구성

1. **페이지** `site/licenses/index.html`: 항목마다 이름·저작권자·라이선스 이름·원문 링크·전문을 둔다. 전문은 원문 그대로 붙인다(083 `pretendard-license.ts` 원칙). 모델 이름은 이 페이지에 나와도 된다(앱 화면이 아니다). 사이트 HTML은 prettier로 포맷하지 않는다.
2. **앱**:
   - `src/app/policy-links.ts`에 주소 한 줄(`LICENSES_URL`).
   - `src/i18n/catalogs/ko/license-links.ts` 새 영역 파일(086 `policyLinks`·083 `fontLicense`·099 `lossNotice` 방식). 기존 문구는 건드리지 않는다.
   - 설정 조립부에 새 행 하나. 문구 골든은 `ADDED_AFTER_GOLDEN`에만 덧붙인다.
3. **테스트**: 페이지 구조 잠금(항목 네 묶음·원문 링크), 앱 주소 ↔ 사이트 경로 일치, **앱 문구에 모델 식별자가 없을 것**(원칙 III 방어). 새 규칙은 위반 주입으로 검증한다.
4. **건드리지 않는다**: `src/i18n/catalogs/ko/`의 기존 문구, 설정의 기존 행, 홈 화면 문구, 099가 바꾼 방침 「보존과 삭제」·지원 「앱을 지우면」 문장, 실측 세션의 제목 구간·동작 줄이기 코드.

## 원문 출처 (1차 확인 전 — 스펙에서 확정)

2026-10-22에 WebFetch로 읽은 **요약**이다. 2차 자료이므로 라이선스 조항을 이 요약에 기대지 않는다. 스펙에 원문 URL·확인일·해시를 남긴다.

- LFM: `https://huggingface.co/LiquidAI/LFM2.5-VL-450M/raw/main/LICENSE` (LFM Open License v1.0)
- Kanana: `https://huggingface.co/kakaocorp/kanana-1.5-2.1b-instruct-2505` (카드에 `apache-2.0`만 있고 라이선스 본문 링크가 없다)
- DevQuasar GGUF 저장소의 표기
- llama.cpp: `https://github.com/ggml-org/llama.cpp/blob/master/LICENSE` (MIT, "The ggml authors")
- llama.rn: `https://github.com/mybigday/llama.rn/blob/main/LICENSE` (MIT, Jhen-Jie Hong)

## 소유자가 읽어야 하는 항목 (표시)

- **H1** LFM Open License v1.0 5절 — 연 매출 1,000만 달러 이상 법인의 상업적 이용 조건(Threshold). 이 앱의 배포가 해당하는지.
- **H2** LFM 4절 — 사본 제공(a), 고지문 유지(d). 앱이 모델 파일을 직접 싣지 않고 내려받게만 하는 것이 "배포"에 해당하는지, 고지를 어디에 어떻게 실어야 하는지.
- **H3** Kanana — Apache-2.0 본문과 저작권 표기를 어디서 인용할지(Kakao 원 저장소 확인). DevQuasar 재배포본의 표기.
- **H4** llama.rn이 번들하는 llama.cpp 버전의 실제 LICENSE와 서드파티 고지(예: 같이 들어오는 다른 코드).

H1·H2·H3은 법적 해석이라 에이전트가 단정하지 않는다. 스펙에 원문 인용과 함께 「소유자 확인 필요」로 올린다.

## 완료 조건

세 모델과 네이티브 라이브러리의 고지가 `site/licenses/`에 있고, 앱 설정 「정보」에서 열린다. 헌법과 어긋나지 않는다(헌법 개정 없음). `npm test`·`npm run lint` 통과, dev 빌드로 실기기 1회 확인(행 → 브라우저 열림).

## 위험

- 원문을 읽지 않고 요약으로 고지를 쓰면 의무를 못 채울 수 있다 → H1~H4를 소유자가 읽기 전에는 확정 문구로 보지 않는다.
- 앱 화면 문구에 모델명이 새면 원칙 III을 조용히 어긴다 → 문구 테스트로 막는다.
- 사이트 배포(GitHub Pages)가 앱 릴리스와 따로 나간다 → 새 행이 열 주소가 배포된 뒤에 앱을 올린다.
