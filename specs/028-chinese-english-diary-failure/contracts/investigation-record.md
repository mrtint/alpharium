# Contract: 조사 관측 레코드 (US1)

**문서 전용 계약** — 코드 계약이 아니다. `findings.md`가 이 규칙을 만족하면
US1(FR-001~FR-005, SC-001·SC-002)이 충족된다.

---

## C-IR-1 — 두 캐릭터 각 3회 관측이 기록된다

`findings.md`에 `chinese` 3행, `english` 3행의 표가 있고, 각 행은
`InvestigationRun`의 필수 필드(`branch`, `endingKind`, `eyeballVerdict`)가
채워져 있다. `branch`가 `rejected:*`·`timed-out`·`generation-failed`면
`rejectedBody` 전문이 함께 있다.

**위반 예**: 3회 중 1회만 기록 / `branch`가 "실패"처럼 뭉뚱그려짐 /
거부 본문 없이 갈래만.

---

## C-IR-2 — 갈래는 로그의 `{ kind }`에서 온다

`branch` 값은 `adb logcat`에서 관측한 `on-device.ts` 반환
`{ kind: "rejected", why }` / `{ kind: "timed-out" }` /
`{ kind: "generation-failed", reason }` 또는 파이프라인이 담은
`` `${kind}: ${detail}` `` 문자열에서 확정한다. **화면 문구에서 추정하지
않는다**(세 갈래가 같은 문구를 공유).

**위반 예**: "다시 시도해 볼 만하다"를 보고 `rejected`로 적음 (근거 부족).

---

## C-IR-3 — 3회 동일이면 확정, 갈리면 분포

- 3회 모두 같은 `branch` → `dominantBranch`로 확정, `residual` 없음.
- 갈림 → `branchDistribution`을 "3회 중 M회 `<갈래>`"로 명시,
  `dominantBranch` = 최빈. 동률이면 근거를 적고 근본적 갈래 택함.
- `residual`(소수 회차)은 findings "미확인 잔여"에 남기고 후속 스펙으로.

**위반 예**: 갈렸는데 하나로 단정 / 분포를 안 적음.

---

## C-IR-4 — 거부 본문은 사람이 육안 판정한다

`eyeballVerdict` ∈ `{empty, echo, wrong-language, mojibake,
normal-target-language, n/a}`. 판정 기준(research §4):

- `mojibake` — U+FFFD(�) 다수 / 고립 surrogate / 제어문자 / 금지
  마크다운 기호(`###`·`**`).
- `wrong-language` — 정상적으로 읽히지만 기대 언어가 아님 (예: qwen3인데
  한글, gemma3인데 한글/한자).
- `normal-target-language` — 정상 중국어/영어인데 `judge()`가 거부함
  (판정 범위 버그 의심).
- `echo` — 지시문(`SPEAKER_RULES`/`TITLE_INSTRUCTION`)의 한 줄이 본문에
  그대로.
- `empty` — 공백만.

**자동 채점 코드를 만들지 않는다**(원칙 IV) — 사람이 읽고 `findings.md`에
적는다.

**위반 예**: 스크립트로 mojibake 점수를 매김 / 임계값으로 분류.

---

## C-IR-5 — 환경 메타가 기록된다

`findings.md` 헤더에 기기·Android SDK·빌드 종류·Metro clean 여부·
`llama.rn` 버전(0.12.8)·모델 파일(a4/a5)·조사 날짜.

**위반 예**: "실기기에서 확인함"만 적고 어느 기기·어느 빌드인지 없음.

---

## C-IR-6 — 임시 로그의 삽입·제거가 기록된다

`findings.md`에 (1) `on-device.ts`의 어느 3개 분기에 `console.log`를
넣었는지, (2) `git grep "028-investigation"` → 0건, (3) `git diff src/`에
안 보임 — 세 가지가 확인으로 남는다.

**위반 예**: 임시 로그를 남긴 채 종료 / 제거를 확인 안 함.
