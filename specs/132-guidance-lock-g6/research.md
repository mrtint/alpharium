# Research: G6

- **R1 카탈로그 문자열 추출** — Decision: `__tests__/i18n/ko-literals.ts`의 `koLiterals`(주석 제거·템플릿 정규화)를 재사용. Rationale: 골든과 같은 추출기라 함수형 문구(`previewIos`)도 리터럴로 잡힌다. Alternative: 카탈로그 객체를 실행해 값 수집 — 함수 인자를 지어내야 해 버림.
- **R2 개발 전용 영역** — Decision: K1에서 `developer`·`diagnostics`·`fast-cycle`·`simulation`·`attempts`·`failures`(진단 화면 갈래 이름) 파일을 뺀다. Rationale: 규칙 문서 A1·4장 범위.
- **R3 웹 문서 주석** — Decision: `<!-- … -->`를 걷고 검사. Rationale: 방침의 근거 주석이 「보장」을 정당하게 담는다.
- **R4 iOS 버전** — Decision: `Platform.Version`(iOS는 문자열 "27.0.1")을 `parseInt`로 주 버전만, `NaN`이면 모름. Rationale: 네이티브가 `#available(iOS 26)`로 가른다.
- **R5 K3 짝** — Decision: `*Ios` 키를 키 이름 정규식으로 찾고, 명시 짝 표(`permBatteryHintIos→settings.permBatteryHint`, `previewIos→targetHour.preview`, `conditionIos→conditionAndroid`) 또는 허용 목록(`writingLeaveNoteIos`, 까닭)으로 판정. 새 `*Ios` 키가 어느 쪽에도 없으면 실패.
- **R6 K8·K9** — Decision: `DiaryListScreen`에 `constraint`·`toast`·`writing` props를 직접 준다. 기존 `__tests__/ui/diary-list.test.tsx`의 렌더 도우미를 참고.
