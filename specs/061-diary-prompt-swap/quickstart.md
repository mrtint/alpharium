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

---

## 결과 (2026-10-06)

| 단계               | 결과                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ① 바이트 대조      | **10/10 일치** (`prompt`·`instructionLines`·제목 질문). my-ollama `gen-prompts.ts`를 그대로 돌리면 Windows에서 `ERR_UNSUPPORTED_ESM_URL_SCHEME` — import 두 줄만 `pathToFileURL`로 바꾼 스크래치 복사본으로 돌렸다(my-ollama 작업 트리 무변경). 기대값은 `R16`·`R17`을 export한 스크래치 복사본에서 뽑았다(`variants.ts --round`는 Windows에서 진입 가드가 서지 않는다). 위반 주입(꼬리 낱말 하나 바꿈) → 본 장면 없는 넷이 불일치로 잡혔다 |
| ② `npm test`       | 216 스위트 통과, 실패 0(기준선도 0). `prompt-e2sn.test.ts`·`prompt.test.ts`는 고쳐 썼다 — 고치기 전 둘 다 깨졌다(34건, `prompt-preview`·`generate` 포함)                                                                                                                                                                                                                                                                                    |
| ③ 계약             | prompt-signature·acceptance A-7·title 통과. 018 접두사 같은 배열은 소스 테스트(E4/P8 `fixedHead(`)로 잠갔다. `npm run lint` 통과(경고 2건은 이 작업 전부터 있던 다른 파일)                                                                                                                                                                                                                                                                  |
| ④ 기기 등가 재측정 | **돌리지 못했다** — 이 기계에 `llama-server`·DevQuasar GGUF가 없다                                                                                                                                                                                                                                                                                                                                                                          |
| ⑤ 실기기 6편       | **돌리지 못했다** — 기기(SM-S901N)가 잠겨 있다(`deviceLocked=1`, PIN은 사람이 넣는다)                                                                                                                                                                                                                                                                                                                                                       |
