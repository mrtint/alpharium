# 「AI slop」 조사와 앱 점검

로드맵 과제 「앱의 「AI slop」 줄이기」의 할 일 1(조사)과 할 일 3(앱 점검)이다. **기준은 아직 정하지 않았다**(할 일 2, 소유자 몫). 그래서 점검은 조사 목록 전체를 앱에 대 본 결과이고, 「고칠 것」 목록이 아니다.

- 범위: 앱 화면(`src/ui/`)과 한글 카탈로그(`src/i18n/catalogs/ko/`). 웹(`site/`)·일기 본문 말투(`src/diary/prompt.ts`)·캐릭터 아트는 범위 밖이다.
- 점검 시점: 커밋 `fdf58f7`. 위치는 그 시점의 파일·키다.
- 문구 갈래는 별도 과제 「안내 규칙 문서」의 입력이다. 여기서는 **말투 규칙을 정하지 않고 후보로만 적는다.**
- 기기 없이 소스만 읽었다. 화면이 실제로 어떻게 보이는지는 확인하지 않았다(헌법 원칙 V — 화면 인상에 관한 판단은 모두 소스에서 읽은 것이다).

## 출처와 읽은 방법

이 세션의 네트워크는 GitHub(raw)만 열려 있었다. 그래서 출처를 둘로 나눈다.

| 표시 | 뜻 |
| --- | --- |
| **원문** | 본문을 직접 내려받아 읽었다 |
| **요약** | 검색 결과 요약만 봤다. 원문을 열지 못했다(호스트 차단). 인용은 요약에 나온 범위까지다 |
| **[미확인]** | 출처를 찾지 못한 주장. 내 판단이거나 일반론이다 |

| 기호 | 출처 | 읽은 방법 |
| --- | --- | --- |
| A1 | Anthropic, `frontend-design` 스킬 — [anthropics/skills `skills/frontend-design/SKILL.md`](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) | 원문 |
| A2 | Anthropic, 쿡북 「Prompting for frontend aesthetics」 — [anthropics/claude-cookbooks `coding/prompting_for_frontend_aesthetics.ipynb`](https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb) | 원문 |
| H1 | blader, `humanizer` 스킬(위키백과 「Signs of AI writing」 기반) — [blader/humanizer `SKILL.md`](https://github.com/blader/humanizer/blob/main/SKILL.md) | 원문 |
| U1 | Laith0003, 「How to detect AI slop in your design」 — [ux-skill 위키](https://github.com/Laith0003/ux-skill/wiki/How-to-detect-AI-slop-in-your-design) | 원문 |
| W1 | 위키백과 「Wikipedia:Signs of AI writing」 — [원문](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), 소개 [FlowingData](https://flowingdata.com/2025/10/20/signs-of-ai-writing-on-wikipedia/)·[TechSpot](https://www.techspot.com/news/109186-subtle-signs-give-away-chatbot-writing-according-wikipedia.html) | 요약 (H1이 이 문서를 바탕으로 한다) |
| N1 | Nielsen Norman Group, 「Humanizing AI」 — [nngroup.com](https://nngroup.com/articles/humanizing-ai) | 요약 |
| S1 | SaaStr, 바이브 코딩 사이트가 비슷해 보이는 문제 — [saastr.com](https://www.saastr.com/gemini-3-solves-one-of-the-biggest-headaches-with-vibe-coding-now-your-site-doesnt-have-to-look-like-it-was-vibe-coded/) | 요약 |
| S2 | CodeMySpec, 「How to Keep Your Website From Looking Like Every Other Vibe Coded Website」 — [codemyspec.com](https://codemyspec.com/blog/vibe-coded-websites-look-the-same) | 요약 |
| S3 | prg.sh, 「Why Your AI Keeps Building the Same Purple Gradient Website」 — [prg.sh](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website) | 요약 |
| S4 | 925 Studios, 「AI Slop Fonts and Gradients」 — [925studios.co](https://www.925studios.co/blog/ai-slop-design-tells) | 요약 |
| K1 | 디지털마케터, 「클로드와 챗GPT 말투가 티 나는 이유…」 — [digitalmarketer.co.kr](https://www.digitalmarketer.co.kr/insights/claude-load-bearing-vocabulary-github-pr) · 「말투와 문체 지시하기」 — [digitalmarketer.co.kr](https://www.digitalmarketer.co.kr/class/prompt-design-in-practice/tone-and-style-instructions) | 요약 |
| K2 | 브런치, 「AI 특유의 뻔한 말투 지우는 프롬프트」 — [brunch.co.kr](https://brunch.co.kr/@maven/527) | 요약 |
| P1 | Pretendard README — [orioncactus/pretendard `packages/pretendard/README.md`](https://github.com/orioncactus/pretendard/blob/main/packages/pretendard/README.md) | 원문 |

**출처의 성격(가정 G1)**: 대부분이 디자이너·도구 제작자의 실무 관찰이고 측정이 아니다. A1·A2는 모델 제작사가 **자기 모델의 기본 출력**을 보고 쓴 목록이라 「지금 AI가 무엇을 내놓는가」에 대해서는 가장 직접적인 출처로 본다. 요약 출처 중 일부는 자기 도구를 파는 글이다(S2·S4·U1). 그래서 표의 「왜」 칸은 출처의 설명이지 검증된 원인이 아니다.

**모든 출처가 공통으로 말하는 원인**: 모델은 지시가 없는 축에서 학습 자료의 가장 흔한 선택(「on distribution」, A2)을 고르고, 그 흔한 선택이 주제와 상관없이 나타날 때 「AI가 만든 티」로 읽힌다(A1 「defaults rather than choices」, H1, U1, S2). **A1은 목록의 모든 특징이 어떤 브리프에는 정당하다고 덧붙인다** — 판단 기준은 「그 모양인가」가 아니라 「이 주제를 위해 고른 것인가」다.

## 1. 조사 목록

`DESIGN.md` 칸: **겹침** = 디자인 시스템이 이미 같은 방향으로 막고 있다 / **부딪침** = 디자인 시스템의 규칙이 그 특징 자체이거나 그쪽으로 민다 / **없음** = 규칙이 다루지 않는다.

### 1-1. 시각

| # | 무엇이 | 왜 그렇게 읽히나 | 대안 | 출처 | `DESIGN.md` |
| --- | --- | --- | --- | --- | --- |
| V1 | 보라→파랑(인디고→바이올렛) 그라디언트, 흰 바탕 위 보라 | 학습 자료에 가장 흔한 조합이라 기본값이 된다. 의미 없이 히어로·버튼·배경에 깔린다 | 그라디언트는 한 곳에 시선을 모을 때만, 브랜드 색 계열로 | A2, U1, S1, S3, S4 | **겹침** — 그라디언트 금지(「하지 않는 것」) |
| V2 | 크림 바탕(`#F4F1EA` 근처) + 대비 큰 세리프 제목 + 테라코타 강조 | A1이 지금의 AI 디자인이 모이는 첫 묶음으로 꼽는다 | 주제의 재료·어휘에서 색을 고른다 | A1 | 없음 (앱은 세리프·테라코타가 아니다) |
| V3 | 어두운 바탕 + 형광 초록 또는 **주홍(vermilion)** 한 색 강조 | A1의 둘째 묶음. 「한 색으로 절제했다」는 인상 자체가 기본값이 됐다 | 같음 | A1 | **부딪침(일부)** — `accent`가 단일 주홍 계열 레드다. 앱은 밝은 바탕이라 묶음 그대로는 아니다 |
| V4 | 「틴트 넣은 거의 검정」(`#0B0B0B`·`#111`)을 검정 대신 씀 | A1이 템플릿 장식(template chrome)으로 꼽는다 | 쓴다면 이유를 정한다(종이·잉크 같은 주제) | A1 | **부딪침** — `text`가 틴트 든 거의 검정, `bg`가 오프화이트 |
| V5 | 브랜드 색이 내비·버튼·링크·테두리·배지·포커스 링 모두에 나옴 | 실제 브랜드는 한두 면(로고·주 행동)에만 쓴다는 관찰 | 브랜드 색을 쓰는 면의 수를 정한다 | U1 | **겹침(일부)** — `accent`는 「면·표식에만」. 면의 수 한도는 없다 |
| V6 | 모든 것에 같은 큰 반경(`rounded-2xl`) | 반경이 위계를 말하지 않고 한 값으로 덮인다 | 반경을 의미로 쓴다(작은 것·카드·컨테이너·없음) | A1, U1, S1 | **겹침** — 반경 0, 버튼만 6 |
| V7 | **반경 0 + 가는 구분선(hairline) + 빽빽한 신문 단(broadsheet)** | A1이 셋째 묶음으로 꼽는다 — V6을 피한 결과가 다시 기본값이 됐다 | 같음. 「반대로 하기」도 고른 것이 아니면 기본값이다 | A1 | **부딪침** — `RADIUS.card` 0, `border` hairline, 보드 이름부터 Modernist |
| V8 | 카드마다 같은 옅은 회색 그림자(`rgba(0,0,0,.1)`), 그림자+테두리+면 셋을 다 씀 | SaaS 카드 키트의 표준 모양 | 그림자·테두리·면 중 하나만 | A1, U1 | **겹침** — 보드에 없는 그림자 금지. `Card`는 테두리+면 둘을 쓴다 |
| V9 | 기본 서체(Inter·Roboto·Arial·시스템 서체), 눈에 띄는 대체(Plus Jakarta Sans·Geist) | 모든 시작 템플릿의 기본값 | 주제에 맞춰 일부러 고른 서체 | A1, A2, U1, S1 | **부딪침(일부)** — Pretendard는 Inter를 바탕으로 다듬은 서체다(P1). 한국어 화면에서 Pretendard가 「Inter 자리」인지는 [미확인] |
| V10 | 작은 데이터 라벨에 고정폭 서체 | 템플릿 장식 | 고정폭은 실제 코드·표에만 | A1 | **겹침** — 고정폭 금지(`AGENTS.md`, 083) |
| V11 | 본문에 굵기 600, 큰 제목에 음수 자간 없음 | 굵기 인플레이션, 자간 방치 | 본문 400, 큰 글자는 자간을 좁힌다 | U1 | **부딪침(약함)** — `bodyStrong`·설정 행 라벨이 600. 큰 숫자·제목은 음수 자간을 이미 쓴다 |
| V12 | 이모지를 아이콘·장식으로 씀(✨🚀⚡🎉 등) | 「성의를 보였다」는 장식. 브랜드 제품은 이모지로 꾸미지 않는다는 관찰 | 빼거나, 직접 그린 그림·글자로 | U1, S2, H1(제목의 이모지), W1 | **없음** — 이모지 규칙이 없다 |
| V13 | 아이콘 세트 하나(Lucide 등)를 같은 크기·굵기로 전부 | 기본 세트를 그대로 깐 표시 | 아이콘을 적게, 자기 세트로 | U1, S1 | 없음 (앱은 아이콘 세트를 쓰지 않는다) |
| V14 | 다크 모드를 라이트의 반전으로 만듦 | 별도 설계가 아니라 뒤집기 | 다크는 따로 설계 | U1 | 해당 없음 — 앱은 라이트만(031) |

### 1-2. 구성

| # | 무엇이 | 왜 그렇게 읽히나 | 대안 | 출처 | `DESIGN.md` |
| --- | --- | --- | --- | --- | --- |
| L1 | 같은 크기 카드 셋이 한 줄(아이콘·제목·두 줄 본문), 내용을 같은 카드로 잘게 나눔 | 가장 흔한 배치. 위계가 사라진다 | 주된 것 하나를 크게, 나머지는 돕게 | A1, U1 | 없음 |
| L2 | 카드마다 왼쪽 위에 색 원 속 아이콘 | 기능 카드의 표준 모양 | 아이콘 없이 내용으로 | U1 | 없음 |
| L3 | 가운데 정렬 히어로 + 버튼 하나, 모든 요소 가운데 정렬 | 학습 자료에 가장 흔한 배치 | 정렬로 이야기한다(주는 왼쪽, 가운데는 진짜 균형일 때만) | U1, S3 | 없음 |
| L4 | 모든 제목 위의 자간 넓힌 **대문자 눈썹 라벨(eyebrow/kicker)**, 내용 위의 불필요한 라벨 | A1이 「생성된 페이지의 가장 흔한 표시」로 꼽는다 | 정보를 싣는 라벨만 남긴다 | A1, S2 | **부딪침** — 설정 묶음 머리가 「대문자·자간 .1em」(`SETTINGS.group`), 보드에 kicker가 여럿 |
| L5 | 가운뎃점으로 이은 메타 줄(`A · B · C`) | 템플릿 장식 | 정보가 여럿이면 줄을 나누거나 문장으로 | A1 | 없음. **단, 한국어 맞춤법에서 가운뎃점은 나열의 정식 부호다**(「한글 맞춤법」 부록 문장 부호 — 링크 [미확인]). 영어권 출처를 그대로 옮길 수 없다 |
| L6 | 버튼·링크 글자 끝에 붙인 `→`, 「Get started →」 | 템플릿 장식 | 행동 이름만 | A1, U1 | 없음 |
| L7 | 「낱말 — 조각」 꼴 라벨, 띄운 엠대시 | 템플릿 장식 | 쉼표·마침표·괄호, 또는 문장을 고친다 | A1 | 없음 |
| L8 | 순서가 아닌 내용에 붙인 번호 표식(01/02/03) | 구조가 정보가 아니라 장식이 된다 | 실제 순서일 때만 | A1 | 없음 |
| L9 | 정보 없는 장식(구분선·테두리·라벨·점)을 「구조」처럼 씀 | 「구조는 정보다」의 반대 | 장식 하나를 뺀다(「거울 앞에서 장신구 하나」) | A1 | **겹침(일부)** — 「구분선에 정보를 싣지 않는다」. 장식 구분선 자체는 허용 |
| L10 | 모든 절에 페이드·슬라이드 진입, 모든 카드에 호버 효과, 정보 없는 반짝임·맥박 | 생성물의 기본 움직임 | 사용자 행동에 답하는 움직임만, 한 번의 연출 | A1, U1 | **겹침(일부)** — 동작 줄이기 대응(100). 장식 움직임 규칙은 없다 |
| L11 | 빈 상태·오류 상태가 없거나, 있어도 기분(mood)만 말함 | 행복한 길만 만든 표시 | 빈 상태·실패는 「무엇이 왜, 어떻게」를 말하는 자리 | A1, U1 | 없음 |

### 1-3. 문구

**말투 규칙 후보다 — 확정이 아니다.** 「안내 규칙 문서」 과제가 고른다.

| # | 무엇이 | 왜 그렇게 읽히나 | 대안 | 출처 | `DESIGN.md` |
| --- | --- | --- | --- | --- | --- |
| C1 | 챗봇 잔재 — 「물론이죠!」「좋은 질문이에요」「도움이 되었으면 해요」, 인사·칭찬·제안·맺음 | H1이 「가장 확실한 표시」로 꼽는다 | 포장을 걷고 내용만 | H1, W1 | 없음 |
| C2 | 과한 친절·의인화 — 불필요한 인사말, 아부성 동의, 사람인 척하는 말 | 쓸모보다 참여를 앞세운 말로 읽힌다 | 할 일 중심의 말 | N1, K1 | 없음. **부딪침 주의**: 이 앱은 휴대폰이 화자인 의인화가 정체성이다(헌법). 의인화 자체가 아니라 「누구의 목소리인가」를 봐야 한다 |
| C3 | 실패·빈 상태에서 사과하거나 모호함(「문제가 생겼어요」), 기분을 말함 | 「오류는 사과하지 않고, 무슨 일인지 모호하지 않다」 | 무엇이 잘못됐고 어떻게 고치는지 | A1 | 없음 |
| C4 | 같은 꼴 반복 — 같은 문장 시작, 같은 맺음, 셋씩 짝짓기 | 규칙으로 만든 리듬 | 길이·꼴을 섞는다. 셋은 셋일 때만 | H1, W1 | 없음 |
| C5 | 「X가 아니라 Y」 대조, 한 줄 맺음 문장 | 아무도 하지 않은 주장을 부정해 힘을 싣는다 | 바로 말한다 | H1, W1 | 없음 |
| C6 | 엠대시를 만능 연결어로 | 두 절의 관계를 고르지 않고 넘어간다 | 마침표·쉼표·괄호 | H1, W1 | 없음 |
| C7 | 광고 말·빈 동사 — 「정리하다·혁신·강력한·멋진」, 「업무를 간소화」「잠재력을 깨우세요」 | 아무것도 말하지 않는 동사 | 구체적인 행동이나 사실 | H1, U1 | 없음 |
| C8 | 과장된 감탄·공감(「와… 정말 핵심을 찔렀어요」), 거창한 인사(「소중한 여정에 함께해 영광입니다」) | 한국어 사용자가 밈으로 아는 AI 말투 | 감탄으로 시작하지 않는다 | K1, K2 | 없음 |
| C9 | 번역투 | 한국어에서 바로 들킨다는 지적 | 주어·목적어 생략, 문장 길이 섞기 | K2 | 없음 |
| C10 | 시스템이 만들어진 방식으로 이름 붙임(「웹훅 설정」) | 사용자가 아는 말이 아니다 | 사용자가 하는 일로 이름 붙인다 | A1 | 없음 |
| C11 | 행동 이름이 흐름 중에 바뀜 | 어휘가 길잡이다 | 버튼「게시」→토스트「게시됨」 | A1 | 없음 |
| C12 | 글과 제목의 이모지·화살표 장식 | 장식 제목 | 빼기 | H1, U1 | 없음 |

## 2. 앱 점검

**읽는 법**: 「해당」은 조사 항목의 모양과 같다는 뜻이지 고쳐야 한다는 뜻이 아니다. 보드·소유자 결정으로 들어온 것이 많아 출처(보드·스펙 번호)를 함께 적는다. 「상위」는 내 판단으로 고른 것이다(아래 「가정」 G4).

### 2-1. 로드맵의 미확인 후보 확인

| 후보 | 결과 | 위치·근거 |
| --- | --- | --- |
| 첫 실행의 `🤖` | **맞다.** 작명 화면 얼굴 타일 한 자리 | `welcome.face`(`src/i18n/catalogs/ko/welcome.ts`), `src/ui/WelcomeScreen.tsx` `FACE_TILE`·`FACE_TEXT`(047 Clarification Q2, 보드 `1a`). 해당 V12·C2. **로봇은 「AI」의 기호이고 「휴대폰」의 기호가 아니다** — 헌법의 화자(휴대폰)와 어긋난다 |
| 확인창의 `😢` | **맞다.** 두 키, 대화상자 제목 맨 앞 | `home.material.confirmTitleZero`「😢 아무 기록도 없어요」·`confirmTitleUnseen`「😢 기록을 볼 수 없어요」(`home.ts`), `src/ui/MaterialDialogs.tsx` 제목. 해당 V12·L11·C3 — 빈 상태에서 기분을 먼저 말한다. 앱 문구의 이모지는 이 세 자리가 전부다 |
| 혼잣말 풀의 「…하는 중…」 반복 | **맞다.** `monologue`의 일곱 풀(`signals`·`visionNormal`·`visionMany`·`loadCold`·`loadHot`·`generation`·`title`) **모든 후보**가 「…중…」으로 끝난다 | `src/i18n/catalogs/ko/monologue.ts`. 해당 C4. 아래 2-3에 더 있다 |
| 균일한 카드 | **아니다.** 화면이 공용 `Card`·`Section`을 쓰는 곳이 없다(`components/Card.tsx`의 `Section`이 `Card`를 감쌀 뿐, 다른 파일이 import하지 않는다). 홈은 지면·스트립, 설정은 묶음 행, 쓸 재료는 구분선 없는 두 칸(`MaterialGrid.tsx`)이다. L1·L2·V8의 SaaS 카드 키트는 없다 | `grep components/Card src/ui` |
| (덧붙임) 앱이 실제로 닮은 것 | **V7·V3·V4·L4 묶음** — 반경 0·hairline·단일 주홍·틴트 검정·대문자 kicker. A1이 「지금 AI 디자인이 모이는 곳」으로 꼽은 둘째·셋째·다섯째 묶음과 겹친다 | `design/tokens.json`(`accent`·`text`·`bg`·`border`·`radius`), `RADIUS.card` 0 |

### 2-2. 시각

| 항목 | 위치 | 내용 |
| --- | --- | --- |
| V7·V3·V4 (상위) | `design/tokens.json`, `src/ui/theme/tokens.ts` | 디자인 시스템 자체가 A1의 클리셰 묶음과 겹친다. 고칠 대상이 화면이 아니라 정본이라 **할 일 2에서 가장 먼저 정해야 한다**. A1도 「브리프가 그 모양을 고르면 따른다」고 하므로, 소유자가 이 방향을 주제(휴대폰·일기)에 묶어 설명할 수 있으면 유지가 답이다 |
| V5 | `COLORS.accent`를 직접 쓰는 화면 파일이 공용 부품 포함 열 곳 넘게 있다(버튼·토글·달력·스트립·사진 점·스플래시 점·로고 마크·토스트·대화상자 등) | 「면·표식에만」은 지켜지지만 면의 수는 많다. 한도를 둘지는 기준 문제 |
| V9 | `FONT`·`TEXT_FONT`(Pretendard) | Inter 바탕(P1). 대체 서체를 고를 때 라이선스·자체 호스팅 규칙(`DESIGN.md` 「서체」)이 함께 걸린다 |
| V11 | `TYPE.bodyStrong`, `SETTINGS.row.labelWeight` 600 | 설정 행 라벨이 모두 600. 약한 항목 |
| L9 장식 점 | `src/ui/LogoScreen.tsx` `SplashView` 로딩 점 셋(accent·반투명 accent·회색) | **정적이다** — 움직이지도 진행을 말하지도 않는 「로딩」 모양(파일 주석 「정적 표시 — FR-005」). 정보 없는 장식이라 L9에 해당 |
| 그림자 | `FailureToast.tsx`·`DeveloperToast.tsx`(`TOAST.shadow`), `Dialog.tsx`(`OVERLAY.faceShadow`) | 떠 있는 겹에만 하나씩 — 보드 값이고 위계를 말한다. **해당 없음**으로 본다 |
| 움직임 | `rnr/dialog.tsx`·`alert-dialog.tsx` `FadeIn`, `FadeLayer` | 모두 사용자 행동에 답한다(열기·날 바꾸기). L10 **해당 없음** |

### 2-3. 구성·기호

| 항목 | 위치 | 내용 |
| --- | --- | --- |
| L4 kicker (상위) | `welcome.kicker`「POCKETLOG」(대문자, 자간 1.1, `WelcomeScreen.tsx` `KICKER`), `download.kicker`「준비하는 중」(`DownloadProgressScreen.tsx`, `textTransform: "uppercase"`), `home.writing.kicker`「쓰는 중」(`WritingPaper.tsx`·`DiaryListScreen.tsx`), 스플래시 캡션(`LogoScreen.tsx` uppercase), 설정 묶음 머리(`SettingsScreen.tsx` uppercase) | 한글에는 대소문자가 없어 대문자 효과는 라틴 글자(「POCKETLOG」)에만 난다. 「쓰는 중」은 바로 아래 혼잣말도 「…중…」이라 **같은 말을 두 번** 한다. 설정 묶음 머리는 묶음 이름이라는 정보를 싣는다 — 남길 근거가 있다 |
| L6 `→` (상위) | `welcome.submitArrow` — 버튼 글자가 「확정  →」(`WelcomeScreen.tsx`, 보드 `1a` 「화살표 아이콘 자리」) | A1·U1이 이름으로 꼽는 모양 그대로 |
| L6 `←` | `home.writtenDay.backToHome`「← 일기」 | 뒤로 가기 표지라 정보는 있다. 설정의 뒤로는 따로 그린 `‹`(`BACK_CHEVRON`)라 **같은 일에 두 기호**다 |
| `›` | `home.material.caret`, 설정 행(`SettingsScreen.tsx`), 달력 넘김(`DateJumpDialog.tsx`) | 누를 수 있는 행을 알리는 플랫폼 관례(`DESIGN.md` 「설정 행」이 규칙으로 정함). **해당 없음** |
| L7 엠대시 | `onboarding.assetsNoSkip`「이 단계는 건너뛸 수 없어요 — 없으면 일기를 쓸 수 없습니다.」 | 화면 문구에서 엠대시는 이 한 곳(주석 제외) |
| L5 가운뎃점 | 사용자 화면: `settings.groupPerm`「권한 · 휴대폰 설정으로 이동」, `targetHour.timeZoneLine`「이 휴대폰의 시간대 · 서울 (GMT+9)」, `policyLinks.openFailed`. 개발자·진단 문구에 다수 | 「이름·설정」 같은 붙인 나열은 맞춤법상 정상이다. A1의 「`A · B` 메타 줄」에 맞는 것은 **띄어 쓴 구분자** 쪽뿐이다 |
| L3 가운데 정렬 | `WelcomeScreen.tsx` `WELCOME_CENTER`(얼굴 타일→제목→본문→구분선→질문→입력, 세로 가운데) | 보드 `1a` 그대로. 스플래시는 왼쪽 정렬이라 앱 전체가 가운데는 아니다 |

### 2-4. 문구 (말투 규칙 후보의 근거 자료)

| 항목 | 위치 | 내용 |
| --- | --- | --- |
| C4 반복 (상위) | `monologue` 전 풀 | ① 모든 후보가 「…중…」 한 꼴. ② 부사 반복 — 「차근차근」「부지런히」「하나씩」「찬찬히」가 여러 풀에 걸쳐 되풀이된다. ③ `visionMany` 후보 전부가 「사진이 많아/넉넉해서/풍성해서/가득해서 …보는 중」 한 틀. 교체 간격(`WRITING.rotateMs`)마다 바뀌어 사용자는 같은 꼴을 연달아 본다. 로드맵 「위험」대로 후보를 줄이면 같은 문장 반복이 늘 수 있어 「꼴을 섞기」와 「수 줄이기」는 따로 다뤄야 한다 |
| 사실 어긋남 (상위) | `monologue.signals`·`visionNormal`·`visionMany`·`generation`·`loadCold`의 「오늘」 들어간 후보 | **지난날도 쓸 수 있다**(049). 지난날을 쓰는 중에 「오늘 찍은 사진들을 살펴보는 중…」이 나올 수 있다 — slop 이전에 사실 문제다(원칙 V). 실기기로 본 것은 아니고 소스로 읽은 것이다 — `src/diary/monologue.ts` `pickMonologue(stage, branch, previous, …)`는 날짜를 인자로 받지 않고 단계 풀에서 무작위로 고른다 |
| C7 광고 말 | `monologue.generation`「하루의 기록들을 멋진 글로 정리하는 중…」 | 자기 글을 「멋진」으로 칭찬한다 |
| C7·C2 「하루를 정리하는 AI」 (상위) | `welcome.logoCaption`(스플래시), `download.slides[0].title`「포켓로그, 하루를 정리하는 AI」, `slides[0].body`「AI가 그날의 사진으로 주인님의 하루를 정리해요.」 | 「정리하다」는 C7의 빈 동사 꼴이고, **화자가 「휴대폰」이 아니라 「AI」로 소개된다**(헌법 「이 앱이 무엇인가」·원칙 II). 로드맵 배경이 말한 「AI를 쓴다는 사실이 아니라 겉모습이 문제」와 반대로, 첫 화면 두 곳이 「AI」를 정체로 내세운다. `LogoScreen.tsx` 머리 주석은 이 자리 문구를 「휴대폰 안에서만」으로 적고 있다 — 주석과 값이 다르다(고치지 않았다) |
| 「AI 모듈」 | `download.consent.title`「AI를 위한 다운로드가 필요해요」, `consentGate.cellular.body`, `home.needsAuthor`, `settings.redownload`·`deviceModules` | 받는 물건의 이름이라 정보는 있다(C10의 반대 방향 — 사용자가 아는 말을 고른 결과일 수 있다). 「AI를 위한 다운로드」는 누구를 위한 것인지가 사용자가 아니라 AI다 |
| C2 의인화의 목소리 | `welcome.checkingBody`「새 친구가 왔어요.」, `welcomeTitle`「안녕하세요. 저는 누구일까요?」, `welcomeBody`「…잘 기록하도록 해볼게요.」 | 휴대폰 캐릭터의 인사라 의인화 자체는 정체성이다. 다만 「새 친구」「저는 누구일까요?」는 범용 챗봇·펫 앱 인사 꼴이고, 「잘 …하도록 해볼게요」는 과한 다짐이다(C1·C8 쪽) |
| 호칭 흔들림 | `welcome.welcomeBody`·`download.slides[0].body`「주인님」, `monologue.generation`「주인의」 | 같은 화자가 「주인님」과 「주인」을 섞는다. slop 항목은 아니고 일관성 문제다 |
| C3 실패 문구 | `home.failToast`「일기를 쓰지 못했어요.」(다섯 갈래 한 줄 — 054 소유자 결정), `onboarding.assetsFailedOther`「다운로드 중 문제가 생겼어요.」, `welcome.failedTitle`/`failedBody`「아직 준비 중이에요」「잠시 후 다시 시도해 주세요.」 | A1 기준으로는 모호하다. `failToast`는 소유자 결정이고, 오류 원문을 숨기는 것은 원칙 III 때문이다 — 「원인은 숨기되 다음 행동은 말한다」가 기준 후보다 |
| C3 기분 | `😢` 두 키(2-1), `home.material.emptyNote`「기록 대신 상상으로 하루를 채워요.」 | 빈 상태를 기분과 감상으로 말한다. 다만 「상상으로 채운다」는 무엇이 일어날지를 알리는 사실 문장이기도 하다 |
| 맺음꼴 섞임 | `onboarding.intro`「…건너뛰어도 됩니다.」, `assetsBody`「…다운로드하는 중입니다.」, `done`「…확인했습니다.」, 권한 `rationale` 네 개「…씁니다/요청합니다」 | 홈·설정은 해요체로 정했는데(048) 첫 실행 권한 화면은 합쇼체가 섞인다. slop 출처가 꼽은 항목은 아니다 — 「안내 규칙 문서」로 넘길 자료 |
| C8·C1 | (찾지 못함) | 「물론이죠」「좋은 질문」「도움이 되었으면」 같은 챗봇 잔재와 과장 감탄은 카탈로그에 없다 |

## 3. 할 일 2에 넘기는 질문

소유자가 고를 기준 후보다. 순서는 영향이 큰 것부터다.

1. **디자인 방향(V7·V3·V4·L4)**: Modernist(반경 0·hairline·단일 레드·틴트 검정)를 (가) 그대로 두고 주제와 묶는 이유를 `DESIGN.md`에 적는다 / (나) 정본의 일부(예: 틴트 검정, kicker)만 바꾼다 / (다) 방향을 다시 잡는다. — 정본(`design/tokens.json`)과 웹이 같이 움직이는 결정이다.
2. **이모지**: (가) 앱 화면 전면 금지(소스 계약으로 잠금) / (나) 캐릭터 얼굴 자리만 허용 / (다) 지금대로.
3. **얼굴 타일**: `🤖` 대신 (가) 휴대폰을 가리키는 그림·기호 / (나) 타일을 없앰 / (다) 사용자가 지은 이름의 첫 글자 같은 글자 타일. 캐릭터 아트는 범위 밖이라 (가)는 헌법·로드맵 확인이 먼저다.
4. **반복 문구 한도**: (가) 한 풀 안에서 같은 끝맺음은 절반까지 / (나) 끝맺음 제한 없이 「연달아 같은 꼴 금지」만 / (다) 지금대로. 「오늘」 들어간 혼잣말은 기준과 별개로 사실 문제라 따로 결정한다.
5. **「AI」라는 낱말**: (가) 화면에서 정체 소개로는 쓰지 않고 받는 물건 이름(「AI 모듈」)으로만 / (나) 전부 다른 말로 / (다) 지금대로.
6. **장식 기호**: `→`(버튼 끝)·띄운 가운뎃점 구분자·엠대시·정적 로딩 점을 (가) 모두 뺀다 / (나) 정보가 있는 것만 남긴다 / (다) 지금대로.
7. **실패·빈 상태 문구**: 「원인은 숨기되 다음 행동을 말한다」를 기준으로 할지(원칙 III와 함께 본다).

## 가정

- **G1** 출처 대부분은 실무 관찰이다. A1·A2를 가장 무겁게 보았다(모델 제작사가 자기 모델의 기본 출력을 보고 쓴 것). 검색 요약만 본 출처는 표에 「요약」으로 남겼다.
- **G2** 영어권 출처의 문장 부호·대문자 항목은 한국어에 그대로 옮기지 않았다. 가운뎃점은 한국어 정식 부호라 「띄어 쓴 구분자」만 해당으로 봤고, 대문자 항목은 라틴 글자에만 적용했다.
- **G3** 의인화(C2)는 금지 항목으로 보지 않았다. 헌법이 휴대폰을 화자로 정했으므로 「누구의 목소리인가」(휴대폰인가, 범용 AI·챗봇인가)로 바꿔 읽었다.
- **G4** 「상위」는 내 판단이다 — 첫 화면에 보이는가, 여러 화면에 걸치는가, 헌법과 어긋나는가를 기준으로 골랐다.
- **G5** 보드·소유자 결정으로 들어온 값(얼굴 타일, `→`, `failToast` 등)도 점검에서 빼지 않았다. 바꿀지는 할 일 2가 정한다.
- **G6** 화면을 기기에서 보지 않았다. 「같은 꼴을 연달아 본다」 같은 체감 서술은 소스(교체 간격·후보 목록)에서 읽은 것이다.
- **G7** 개발자·진단 화면(개발 환경 전용)은 점검 표에 올리지 않았다. 일반 사용자가 보지 않는다.
