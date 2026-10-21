# Contract: 표준 동의의 받을 양 (095)

스펙 FR-001~FR-009에 대응한다. 테스트는 이 ID로 이름을 단다. 074 `consent-gate.md`의 CG6·CG11을 이 문서가 대체한다(나머지 CG는 그대로).

## 카탈로그 (`src/i18n/catalogs/ko/download.ts`)

- **DS1** `download.consent.body`는 `(size: string | null) => string`이다. `null`이면 「일기를 쓰려면 사진을 읽는 모델과 글을 쓰는 모델을 내려받아야 해요. 한 번만 받으면 이후로는 필요 없어요.」(바이트 동일), 값이 있으면 「일기를 쓰려면 사진을 읽는 모델과 글을 쓰는 모델을 약 {size} 내려받아야 해요. 한 번만 받으면 이후로는 필요 없어요.」 (FR-001·FR-002)
- **DS2** 062 골든: 새 문장은 `ADDED_AFTER_GOLDEN`, 원래 문장은 골든 그대로(G1·G2 통과). (FR-008)

## 훅 (`src/app/use-consent-gate.ts`) — CG6 대체

- **DS3** 마운트(또는 `recheck`) 시 `readConnection`과 `readSizeLabel`을 **각각 정확히 한 번, 동시에** 부른다 — 연결 읽기가 끝나기 전에 양 읽기가 이미 시작돼 있다. (FR-006)
- **DS4** 연결이 `cellular`가 아니면 `view === "standard"`이고 `sizeLabel`은 읽은 값(또는 `null`)이다. `cellular`면 074와 같이 `view === "cellular"`. (FR-001·FR-007)
- **DS5** 양 읽기가 거부되거나 `READ_LIMIT_MS` 안에 안 끝나면 `sizeLabel === null`. 기본값을 넣지 않는다. (FR-002)
- **DS6** 둘 다 응답하지 않으면 `READ_LIMIT_MS`(3초)가 지난 시점에 `standard{null}`이 된다 — 6초가 아니다. 그 전에는 `reading`. (FR-006·SC-003)
- **DS7** 둘 중 하나만 끝난 동안은 `reading`이다 — 갈래는 둘 다 끝난 뒤 한 번에 정한다. (FR-006a)

## 화면

- **DS8** `DownloadConsentDialog`는 `sizeLabel: string | null` prop을 받아 본문에 `TEXT.body(sizeLabel)`를 쓴다. 버튼은 `download-consent-confirm` 하나, testID·제목·버튼 문구 불변, 콜백 prop은 `onConfirm` 하나. (FR-001·FR-004)
- **DS9** 화면 소스에 모델 식별자·자산 키 리터럴이 없고 `essential-assets`·`network-port`를 import하지 않으며, 숫자·단위(`GB`·`MB`) 리터럴도 없다 — 양은 prop으로만 온다. (FR-005·FR-002)
- **DS10** `DownloadConsentGate`는 표준 동의에 `gate.sizeLabel`을 넘긴다. 모바일 동의(`CellularConsentDialog`)와 대기 화면은 바뀌지 않는다. (FR-007)
- **DS11** 코드·테스트 주석이 「045 FR-003 — 표준 동의에는 용량을 노출하지 않는다」를 근거로 드는 자리가 남지 않는다. (FR-009)

## 위반 주입(구현 때 한다)

1. 훅이 연결을 다 읽은 뒤에 양을 읽게 되돌림 → DS3·DS6 실패.
2. 표준 갈래의 `sizeLabel`을 `null`로 고정 → DS4 실패.
3. 화면이 `sizeLabel ?? "2.0GB"`로 지어냄 → DS9(또는 DS1 null 문장 단언) 실패.
4. 카탈로그가 `null`에도 「약 null」을 만듦 → DS1 실패.
