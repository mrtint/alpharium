# Contract: 문서류 판정 (src/vision/caption.ts)

- D1 판정은 `caption.ts` 한 파일에만 있다. 낱말·표지·비율은 export하지 않는 파일 로컬 상수다(소스 계약으로 잠근다).
- D2 읽기 전: `filename`이 `screenshot`으로 시작(대소문자 무시) → 건너뜀. `height/width ≥ 2`(둘 다 양수일 때만) → 건너뜀. 경로 해석·리사이즈·묘사를 부르지 않는다. `unreadable`+1.
- D3 읽은 뒤: 묘사 앞의 `*`·`#`·공백을 벗긴 글이 `question:`으로 시작하거나 `\b(receipt|invoice|document|transaction)s?\b`(대소문자 무시)를 품으면 → 담지 않음, 사본을 지움(소유한 경우), `unreadable`+1.
- D4 빈 묘사는 종전대로 실패한 장(`unreadable`에 세지 않음).
- D5 그만두기는 종전대로 `null`.
- P1 (on-device) 묘사 0·`unreadable` 0·고른 장 >0 → 실패(종전). 묘사 0·`unreadable` >0 → `seen`.
- P2 (prompt) 하루 종류가 `unread`이고 `vision.unreadable` >0 → 사진 문장 뒤에 「글자가 적힌 사진이 N장 있었지만 내용은 읽지 못했어요.」 묘사가 남은 날(`scenes`)에는 없다.
