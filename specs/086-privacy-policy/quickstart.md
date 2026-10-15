# Quickstart: 개인정보처리방침·지원 페이지와 데이터 선언

작업 디렉터리: `/Users/mrtint/MyDevs/alpharium-privacy`(워크트리, 브랜치 `086-privacy-policy`). 원래 디렉터리는 다른 세션이 쓴다 — 거기서 브랜치·파일을 건드리지 않는다.

## 1. 기기 없는 확인

```bash
npx jest __tests__/privacy __tests__/ci/pages-workflow.test.ts __tests__/config/ios-permissions.test.ts --selectProjects logic
npx jest __tests__/ui/settings-policy-rows.test.tsx --selectProjects ui
npm test
npm run lint
```

기대: 전부 통과. 자리표시자가 남아 있어도 jest는 통과한다(S6).

## 2. 위반 주입

`contracts/policy-facts.md`·`pages-workflow.md`의 표를 하나씩 주입 → 해당 규칙이 실패 → 되돌림 → 다시 통과. 주입이 실제로 적용됐는지(`grep`) 먼저 본다(AGENTS 「위반 주입은 치환이 실제로 적용됐는지 먼저 단언한다」). 워크플로의 자리표시자 검사 단계는 같은 명령을 로컬에서 돌려 실패를 본다:

```bash
# 자리표시자가 남은 상태 → 실패(종료 코드 1)와 남은 자리 출력
bash -c '<pages.yml의 검사 명령>'
```

결과는 `## 실측` 아래 표로 남긴다.

## 3. 실기기 (dev) — **먼저 소유자에게 기기·Metro가 비었는지 묻는다**

다른 세션이 SM-S901N·Metro 8081을 쓴다. `pm clear`·설치·`run-as` 쓰기는 하지 않는다. 이 워크트리의 `.env.development.local`은 소유자가 복사한다(deny 규칙).

1. 이 워크트리에서 Metro(`--clear`) → `adb reverse tcp:8081 tcp:8081` → 기기의 debug 앱에 이 번들을 올린다(네이티브 변경 없음 — `app.json` 문구 변경은 iOS만).
2. 설정 → 「정보」: 행 순서(R1)를 본다. 「개인정보처리방침」·「도움말·문의」를 누르면 기기 브라우저가 각 URL로 열린다(게시 전이면 404 — 브라우저가 열리는 것까지).
3. 글꼴 2.0배에서 두 행이 겹치지 않는다.
4. 실패 줄은 기기에서 만들기 어렵다 — 화면 테스트(R4)와 통로 테스트(B1)로 갈음하고 그 사실을 적는다.
5. (선택, M7 보강) 비행기 모드에서 사진·좌표가 있는 날을 쓰면 장소 이름이 비는지 — 일기를 하나 더 쓰게 되므로 소유자에게 묻고 한다.

## 4. 게시 (완료 조건 — 소유자와 함께)

1. 소유자가 `{SUPPORT_EMAIL}`·`{OPERATOR}`·`{EFFECTIVE_DATE}` 값을 준다 → 원문에 채운다 → 소유자가 채운 방침·지원 원문을 읽고 승인한다.
2. 소유자가 저장소 Settings → Pages → Source를 「GitHub Actions」로 둔다.
3. PR 머지(`main`에 `site/**` 변경) → 「Pocketlog Pages」 워크플로가 돈다 → 자리표시자 검사 통과 → 배포.
4. `https://mrtint.github.io/alpharium/privacy/`·`…/support/`가 열린다(`curl -sI`의 200과 브라우저).
5. 실기기 설정의 두 행에서 게시된 페이지가 열린다.
6. 소유자가 `docs/store/privacy-declarations.md`를 보고 Play Console·App Store Connect에 입력한다(이 기능의 완료 조건 밖 — 입력했는지는 소유자가 알려 주면 기록).

## 실측

(구현 뒤 채운다 — 위반 주입 표, 실기기 결과, 게시 결과, 하지 못한 것과 그 까닭.)
