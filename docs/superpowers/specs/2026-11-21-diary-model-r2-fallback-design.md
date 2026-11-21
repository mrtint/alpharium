# 온디바이스 일기 모델 교체와 R2 미러·폴백 내려받기 — 설계

로드맵 같은 이름 과제의 할 일 1~3. 트랙: 전체(`ModelAsset` 계약 변경·외부 경로 추가·변경 파일 5개 초과).

## 목적

캐릭터 `quiet`(자산 키 `a1`)의 모델을 일기 특화 `kanana-v3-dpo-iq4_nl_im.gguf`로 바꾸고, 주 경로를
Cloudflare R2로 옮기되 R2가 실패하면 Hugging Face로 넘어가 받는다. 이미 옛 모델을 받아 둔 기기는
매번 거부·매번 다시 받기 없이 한 번 정리하고 새 모델을 받는다. 샘플링을 실측 최적값으로 바꾼다.

## 정한 값 (출처)

| 항목 | 값 | 출처 |
| --- | --- | --- |
| 주 경로 | `https://pub-9ba5686e50794962939808ea062b7deb.r2.dev/models/kanana-v3-dpo/kanana-v3-dpo-iq4_nl_im.gguf` | 소유자(2026-11-21). `curl`로 200·`Content-Length 1241435520`·`Range` 206 확인 |
| 폴백 | `https://huggingface.co/mrtint0729/kanana-1.5-2.1b-diary-dpo-gguf/resolve/main/kanana-v3-dpo-iq4_nl_im.gguf` | 로드맵 |
| `expectedBytes` | `1_241_435_520` | 로드맵·R2 `Content-Length` |
| `md5` | `dfc35a88fb1f5215f708ea5a348121b8` | 로드맵(terrarium EXP-013~015) |
| 샘플링 | `temperature 0.60`, `top_p 0.90` (`top_k 40`, `n_predict 512`, 문법 유지) | 로드맵(terrarium EXP-015) |

r2.dev는 개발용 주소라 트래픽 제한이 있다 — 상용 전 커스텀 도메인 결정은 소유자 몫으로 남긴다(위험).

## 수용 기준

1. 로스터의 `a1`이 위 주소·폴백·크기·지문을 가진다.
2. 주 경로 받기가 `failed`로 끝나면 같은 `prepare` 안에서 폴백 주소로 **한 번** 다시 받는다. 그때까지 끝난
   구간(체크포인트)은 이어받는다. 사용자 멈춤(`paused`)·검증 실패는 폴백하지 않는다. 폴백도 실패하면 지금처럼 `network`.
3. 옛 `a1` 파일(1.52 GB, 옛 검증 기록)과 옛 구간 기록은 받기 시작 시 정리되고 새로 받는다. 정리 뒤 두 번째
   `prepare`가 다시 지우지 않는다(이어받기 유지).
4. 다시 받기 안내의 받을 양이 옛 파일이 기준보다 클 때 0이 아니라 기대 크기 전체다.
5. `SAMPLING`이 0.60 / 0.90이고 나머지는 그대로다.

## 결정

- **폴백 자리는 `acquisition.prepare`다.** 구간 코어(`runSegmented`)를 바꾸지 않는다. 두 서버 파일이 바이트까지
  같으므로 구간이 섞여도 되고, 마지막 지문 검증이 안전망이다.
- **`ModelAsset.fallbackUrl?: string`** — 선택 필드. 사진 모델 자산은 그대로.
- 옛 파일 정리는 기존 `settleExistingFile`(기준보다 큰 파일 삭제)·`settleResumeRecord`(전체 크기 불일치)가 이미
  한다 — 새 코드 없이 테스트로 잠근다.
- 단일 스트림 `paused` 기록(옛 `savable()`)은 주소를 안에 품어 해석하지 않는다 — 그 재개가 `failed`이면 폴백 경로는
  처음부터 받는다(기록은 폴백 전에 지운다).

## 실기기 확인 (SM-S901N dev)

R2 받기·도중 앱 죽이고 이어받기(Range 206)·md5 검증·HF 폴백(개발 번들에서 주 주소를 틀린 값으로 임시 교체)·
옛 `a1` 교체(기기에 있는 옛 파일)·새 모델로 본문·제목 완주. 못 본 것은 [미확인].
