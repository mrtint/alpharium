# Copy Contract

| ID | 계약 | 근거 |
| -- | ---- | ---- |
| CP1 | 슬라이드 3은 확정 제목·본문이고 본문이 「켜 두면」을 포함하며 바이트·퍼센트·시간 표현이 없다 | FR-001, 045 FR-006 |
| CP2 | 장소 대화상자 「켬」·「자동」 보조 줄은 확정 문장, 「끔」·`placeNotice`는 불변이며 「숫자 대신」이 어디에도 없다 | FR-002 |
| CP3 | 장소 값 줄(`signal-places`)은 `count`·`zero`에서 `accessibilityLabel` 「사진이 찍힌 자리 N곳」을 갖고, `unseen`·`loading`·`no-permission`과 사진 칸·셀 컨테이너(`signal-places-cell`)에는 없다 | FR-003, R1·R2 |
| CP4 | 지원 FAQ `data-faq`는 `[download, auto-write, uninstall, on-device, place-name, places]`이고 새 답은 확정 문장이며 「100m」·숫자 거리가 없다. 다른 항목의 본문은 불변 | FR-004 |
| CP5 | 다시 쓰기 확인 body는 확정 문장이고 「바뀐 뒤에는 되돌릴 수 없어요」를 포함한다 | FR-005 |
| CP6 | `wipeBody`는 확정 문장이다 | FR-006 |
| CP7 | `writing.fallback`·`needsAuthor`는 확정 해요체다 | FR-007 |
| CP8 | 골든 json은 수정되지 않는다(git diff 0). 바뀐 값은 `CHANGED_AFTER_GOLDEN`, 새 값은 `ADDED_AFTER_GOLDEN`에 있다 | FR-008 |
| CP9 | 카탈로그·소스·테스트 단언·Maestro 실행 줄에 옛 문자열 여덟이 남지 않는다(예외: 골든 json 두 파일, `ko-golden.test.ts`의 `from` 값, 주석의 역사 인용) | FR-009, SC-001 |
