# Quickstart — 122 실기기 확인 (SM-S901N dev)

전제: 기기에 옛 `a1`(1,522,796,768 B)과 검증 기록이 있다. Metro 번들만 올린다(모델 보존 — 옛 파일이 시험 대상).

1. 옛 a1 교체: 앱을 열고 쓰기 → 「AI 모듈을 준비해야 해요」 → 다시 받기. `run-as … ls -l files/models`로 옛 파일 삭제·새 파일 생성 확인.
2. R2 받기·이어받기: 받는 도중 `run-as com.a810labs.pocketlog kill -9 <pid>` → 다시 열고 받기. `state.json`의 `doneIndices`가 남은 채 이어지는지, logcat/네트워크에서 Range 요청 확인.
3. md5: 완료 후 `state.json` 검증 기록 `verifiedMd5 == dfc35a88…`, `passed: true`.
4. HF 폴백: 개발 번들에서 `a1.url`을 존재하지 않는 경로로 임시 교체 → 받기 → 예비 경로로 완료(기기 파일 지운 뒤). 되돌린다.
5. 생성: 사진 있는 날 일기 쓰기 → 본문·제목 저장.

## 기록
(실행 후 결과·[미확인] 적기)
