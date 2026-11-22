# Quickstart — 125 실기기 확인

전제: 개발 빌드 + Metro 번들(SM-S901N, `adb reverse tcp:8081 tcp:8081`). 기기에 `files/diary/`의 아래 날이 있다 — 이 기기의 11월 표본 날을 쓴다.

| 날 | 상태 | 기대 |
| --- | --- | --- |
| 2026-11-16 | 사진 8장·자리 4곳(121 이후 일기) | 본문 아래 점 4개·선 3개·범례 4줄·설명 한 줄 |
| 2026-11-15 | 사진 6장·자리 1곳 | 도식 없이 한 줄만 |
| 2026-11-12 | 121 이전 일기(`places` 없음) | 「하루 동선」 칸이 없다 |

## 절차
1. Metro를 띄우고 앱을 연다. 날 스트립에서 11-16을 고르고 지면을 끝까지 내린다 → 도식·범례·설명 한 줄. 점 번호와 범례 번호가 같은 순서다.
2. 같은 날 첫 화면: 본문 노출이 도식 추가 전과 같다(글꼴 1.0배 8줄 이상). OS 글꼴 2.0배로 바꿔 범례가 줄바꿈되고 첫 화면 본문이 3줄인지 본다.
3. 11-15 → 한 줄만, 11-12 → 칸 없음. 날을 빠르게 넘겨(좌우 밀기) 늦은 결과가 다른 날에 그려지지 않는다.
4. 사진 권한을 OS 설정에서 끈 뒤 11-16 → 도식 없이 저장된 이름·때 목록만, 지면은 막히지 않는다(제약 띠가 권한을 말한다).
5. 일기 파일이 바뀌지 않았다 — 도식을 본 뒤 `run-as … cat files/diary/2026-11-16.json`이 시험 전 사본과 바이트까지 같다.
6. 같은 절차를 iPhone 14에서 11-16 하나로 한 번(개발 서명 Release 또는 개발 빌드).

## 자동 확인
```bash
npx jest __tests__/app/day-route.test.ts --selectProjects logic
npx jest __tests__/ui/day-route-section.test.tsx __tests__/ui/diary-home-day-route.test.tsx __tests__/ui/written-day-route-reach.test.tsx --selectProjects ui
npx jest __tests__/config/day-route-rules.test.ts --selectProjects logic
npm test && npm run lint
```

## 못 보는 것 (기록할 때 채운다)
- 사진을 지운 날(자리 수 어긋남)은 실기기에서 만들기 번거로워 단위 테스트로 갈음한다 — 그렇게 적는다.
- iOS 사진 서비스 막힘(4099) 영향, 점·선 크기의 손맛은 실기기에서만 본다.
