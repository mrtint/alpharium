# Quickstart — 061 검증

spec.md의 SC-①~⑤ 순서. 하나라도 실패하면 다음으로 가지 않는다.

## ① 바이트 대조 (my-ollama 쪽, 도구를 이 저장소로 가져오지 않는다)

```bash
cd ~/Workspace/my-ollama
TZ=Asia/Seoul ALPHARIUM_DIR=~/Workspace/alpharium npx -y tsx scripts/device-repro/gen-prompts.ts   # alpharium 출력 → prompts.json
# 기대값: variants.ts의 R16.u1(신호 있는 날)·R17.x1(신호 없는 날) 행. Windows에서는 --round 진입 가드가 서지 않으므로
# 스크래치 복사본에서 R16·R17을 export해 뽑는다(research.md R1).
```

합격: 10케이스 `prompt`·`instructionLines` 글자 일치, 제목 질문 = 행의 `followUp`.

## ② `npm test`

기준선 실패 0(2026-10-06). `prompt-e2sn.test.ts`·`prompt.test.ts`는 고쳐 썼는가 — 고치지 않고 통과하면 실패.

## ③ 계약

`npx jest __tests__/diary/prompt-signature.test.ts __tests__/diary/acceptance.test.ts __tests__/diary/title.test.ts`, 018 접두사 같은 배열(소스),
`npm run lint`.

## ④ 기기 등가 재측정 (my-ollama)

spec.md SC-④ 명령. llama-server + DevQuasar Q4_K_M(md5 `d8506380fd1f0fdb8e4318a01b8b8e34`). 합격선 여덟 줄.

## ⑤ 실기기 6편 (dev)

Metro dev + `adb reverse`. 날의 갈래를 섞어 6편: 캡션 많은 날·적은 날·오늘(하루 안 끝남)·사진 0장·사진 권한 끈 날·(가능하면) 캡션 없는 날.
`files/diary/*.json`에서 제목·본문을 그대로 옮기고 한 줄씩 소감을 적는다.
