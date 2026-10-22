# Data Model: 화면 문구를 사실대로

데이터·상태·저장 형식의 변경은 없다. 카탈로그 항목 하나가 늘어난다.

| 항목 | 모양 | 비고 |
| ---- | ---- | ---- |
| `home.material.placesA11y` | `(n: number) => string` | 「사진이 찍힌 자리 N곳」. `n`은 `Display`의 `count`·`zero`에서 온다(0 포함) |
