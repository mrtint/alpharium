# Quickstart: 상태 흉내 검증

## 기기 없이

```bash
npm run test:logic   # simulation.ts·simulation-store.ts·task.ts BG*·경계 LK*
npm run test:ui      # 홈 HM*·개발자 DV*·진단 DG*
npm test && npm run lint   # 헌법 검사 SIMULATION_LEAKS 포함
```

위반 주입: (1) `src/diary/pipeline.ts`에 `import "../app/simulation"` (2) `task.ts`에서 `simulatedNow` 사용 (3) `write()` 맨 앞 차단 줄 삭제 — 각각 검사·테스트가 잡는지 확인하고 되돌린다.

## 실기기 (dev)

전제: AGENTS 「도구 사용법」(Metro dev, `adb reverse`, 잠금 해제). **일기 폴더를 먼저 백업한다**(`pm clear` 금지).

1. 설정 → 개발자: 「상태 흉내」 묶음·네 행·「개발 빌드만」이 보인다.
2. 「오늘 날짜」 → 미래 날(예: 다음 주 일요일) → 홈이 그 날을 오늘로 그리고 고른다. 대화상자 「끄기」 → 실제 오늘.
3. 「쓸 재료 0으로 보기」 → 안 쓴 날이 0 장 · 0 곳. 「사진 권한 없음으로 보기」 함께 켬 → 권한 없음 칸.
4. 「실패 토스트 보기」 → 개발자·설정을 닫으면 토스트가 한 번 뜬다.
5. 흉내 하나 켠 채: DEV 꼬리표(누르면 개발자), 회색 쓰기 바 + DEV, 누르면 차단 토스트 2초·쓰는 중으로 안 감. 쓴 날의 「다시 쓰기」도 같음. `files/diary/` 파일 목록 변화 없음.
6. 진단: 두 쓰기 행이 눌리지 않고 차단 문구.
7. 헤드리스: 자동 쓰기 목표 시각을 지금 시로, 흉내 켠 채 홈 버튼(`force-stop` 금지) → 잡이 돈 뒤 새 일기·알림 없음.
8. 앱을 완전히 껐다 켜도 흉내가 남아 있다. 개발자 메뉴 「끄기」 → DEV 없음, 다음 실행에도 흉내 꺼짐.
9. Maestro: `maestro test .maestro/state-simulation.yml`.
10. 글꼴 2.0배: 개발자 묶음·DEV 꼬리표·회색 바가 겹치지 않는다.

복원: 흉내를 모두 끄고 일기 폴더 md5를 백업과 대조한다.
