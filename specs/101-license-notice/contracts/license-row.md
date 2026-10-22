# Contract: 앱 행·주소·문구

테스트: `__tests__/ui/settings-license-row.test.tsx`(LR), `__tests__/privacy/policy-links.test.ts`(L1·L2 확장), `__tests__/i18n/license-links.test.ts`(LK).

| ID | 계약 |
|----|------|
| LR1 | 설정 「정보」 묶음의 행 순서는 버전 · 방침 · 지원 · 서체 라이선스 · **오픈소스 라이선스** · (개발자). 새 행 testID는 `settings-licenses` |
| LR2 | 행 이름은 카탈로그 `licenseLinks.row`에서 온다. 콜백이 없으면 누를 수 없는 행이다(083·086과 같다) |
| LR3 | 행을 누르면 `onOpenLicenses`가 불리고, 조립부(`App.tsx`)가 `openInBrowser(LICENSES_URL)`을 부른다. 소스 계약으로 배선을 잠근다 |
| LR4 | 열지 못하면 그 행 아래에 `policyLinks.openFailed(LICENSES_URL)` 한 줄이 danger 톤으로 보이고, 다시 눌러 열리면 사라진다. 한 번에 한 행만 실패를 보인다 |
| LR5 | 기존 행(방침·지원·서체 라이선스·개발자)의 문구·testID·동작은 그대로다 |
| LR6 | `LICENSES_URL`은 `src/app/policy-links.ts`에만 정의되고(086 L5) 사이트 경로 `site/licenses/index.html`과 짝이며 `/`로 끝난다 |
| LK1 | `licenseLinks` 영역은 `row` 하나뿐이고 기존 영역에 키를 더하지 않는다(062) |
| LK2 | `licenseLinks`의 모든 값에 모델 식별자(`kanana`·`카나나`·`lfm`·`liquid`·`llama`·`gguf`·`mmproj`·`2.1b`·`450m`·`q4`·`q8` 대소문자 무시)가 없다 — 위반 주입으로 검증 |
| LK3 | 문구 골든에 `"오픈소스 라이선스"`가 `ADDED_AFTER_GOLDEN`으로만 올라 있고 `src/ui/`가 `models/roster`·`vision/roster`에 닿지 않는다(헌법 검사 `UI_TOUCHES_MODEL` 통과, 예외 목록 무변경) |
