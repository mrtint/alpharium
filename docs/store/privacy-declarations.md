# 스토어 데이터 선언 초안 — Play 데이터 보안 · App Store 앱 개인정보 보호

- **대상**: 소유자. Play Console 「앱 콘텐츠 → 데이터 보안」과 App Store Connect 「앱 개인정보 보호」에 옮겨 적을 때 쓴다. 콘솔 입력은 소유자가 한다.
- **기준**: 2026-10-15의 스토어 문서 정의와 저장소 코드(스펙 086). 콘솔의 질문 문구는 바뀔 수 있으니, 입력할 때 화면의 질문과 아래 답을 맞춰 본다.
- **규칙**: 이 문서는 방침(`site/privacy/index.html`)과 같은 사실을 말한다. 어긋나면 **방침을 먼저 고친다** → 이 문서 → `__tests__/privacy/outbound.ts`. 이 문서만 고친 커밋에서는 CI가 돌지 않으므로 `npm test`를 로컬에서 돌린다.
- **표식**: [코드] 저장소 코드를 읽어 확인 · [문서] 스토어·플랫폼 공식 문서로 확인 · [미확인] 확인할 수 없음 — 보수적 답을 함께 적는다.

## 주소

| 콘솔 항목 | 값 |
| --- | --- |
| 개인정보처리방침 URL (두 스토어) | https://mrtint.github.io/alpharium/privacy/ |
| 지원 URL (App Store) | https://mrtint.github.io/alpharium/support/ |

## 외부 전송 목록과 답의 짝

방침의 「휴대폰 밖으로 나가는 것」 셋이 각각 어느 답이 되는가.

| 외부 전송 | 방침 | Play 답 | App Store 답 |
| --- | --- | --- | --- |
| `model-download` 모듈 내려받기(Hugging Face가 IP 등 일반 웹 요청 정보를 받음) | 모듈 내려받기 | 수집 안 함 — 아래 「IP 주소」 줄 | Data Not Collected — 아래 근거 셋째 |
| `place-name` 일기 한 편당 대표 좌표 하나 → OS 지도 서비스 | 장소 이름 | 정확한 위치 — 수집함(보수적 선언) | Data Not Collected — 아래 근거 둘째 |
| `os-diagnostics` 운영체제 진단 보고(Apple·Google이 모음) | 운영체제의 진단 보고 | 수집 안 함 — 앱이 보내지 않는다 | Data Not Collected — Apple이 모으는 것 |

## Google Play — 데이터 보안

정의([문서] Play Console 고객센터 10787469): 「수집」은 앱에서 사용자 기기 밖으로 데이터를 보내는 것이다(앱의 라이브러리·SDK가 보내는 것 포함). 비공개·공개·프로덕션 테스트 트랙의 앱은 이 양식을 채워야 하며, 양식을 끝내려면 방침 링크가 필요하다. 내부 테스트 트랙만 예외다.

| 질문 | 답 | 근거 | 표식 |
| --- | --- | --- | --- |
| 앱이 필수 사용자 데이터 유형을 수집하거나 공유하나요? | 예 — 위치(아래 한 줄) | 장소 이름을 얻으려 좌표를 OS 지오코더(`android.location.Geocoder`)에 넘긴다. Play 문서는 OS API를 거치는 경우를 직접 다루지 않아 보수적으로 「수집」으로 본다(소유자 결정 2026-10-15) | [문서] |
| 위치 → 정확한 위치 | 정확한 위치 — 수집함 · 공유 안 함 · 선택 사항 · 앱 기능 | 사진 EXIF의 좌표 하나(소수점 그대로 — 3㎢ 미만). 「공유 안 함」: Play의 「공유」는 수집한 데이터를 개발자가 제3자에게 넘기는 것이다 — 좌표는 OS 지오코더가 곧바로 제공자(대개 Google)에 묻고 운영자를 거치지 않으며, 사용자가 켠 기능의 응답을 받는 일이라 「사용자가 시작한 행위」 예외에도 든다고 본다(소유자 결정 2026-10-15 — 「공유 안 함」. 「공유함 · 제3자 Google」이 더 보수적인 대안이다). 「장소 이름으로 보기」 끔이면 보내지 않고, 안드로이드는 위치 권한이 없으면 지오코더를 부르지 않는다(`expo-location` Android가 권한을 먼저 본다 — 선택 사항). 앱 기능(장소 이름 표시)에만 쓴다. 운영자는 받지 않는다 | [코드] |
| 정확한 위치 — 일시적으로 처리되나요? | [미확인] — 보수적 답: 아니요 (소유자 결정 2026-10-15: 이 답으로 적는다) | 앱은 응답(장소 이름)만 일기에 남기지만, 좌표를 받은 지오코더 제공자가 얼마나 보관하는지 알 수 없다 | [미확인] |
| 위치 → 대략적인 위치 | 수집 안 함 | 정확한 위치 줄이 그 좌표를 다룬다. 앱은 IP로 위치를 짐작하지 않는다 | [코드] |
| 사용자 데이터가 전송 중에 암호화되나요? | [미확인] — 보수적 답: 아니요 (소유자 결정 2026-10-15: 이 답으로 적는다) | 모듈 내려받기는 HTTPS다([코드] `huggingface.co` 주소). 지오코더가 좌표를 보내는 방식은 OS가 정해 확인할 수 없다 | [미확인] |
| 사진 및 동영상 | 수집 안 함 | 사진은 기기 안 모듈이 읽고 기기 밖으로 보내지 않는다 | [코드] |
| 앱 활동 · 앱 정보 및 성능(비정상 종료 로그·진단) | 수집 안 함 | 크래시·분석 SDK가 없다(D2 — 넣지 않기로 함, 테스트 F1). 오류 보고는 사용자 설정에 따라 Google이 모은다 — 앱이 보내지 않는다 | [코드] |
| 기기 또는 기타 ID · IP 주소 | 수집 안 함 | 모듈 내려받기 때 Hugging Face가 IP를 받지만 운영자가 보관·사용하지 않는다. Play는 IP를 「실제 사용·관행에 따라」 밝히라고 한다 | [문서] |
| 개인 정보 · 금융 정보 · 건강 · 메시지 · 연락처 · 캘린더 · 파일 · 웹 기록 | 수집 안 함 | 계정이 없고 해당 데이터를 읽거나 보내는 코드가 없다(테스트 F1~F4) | [코드] |
| 사용자가 데이터 삭제를 요청할 수 있는 방법 | 운영자가 보관하는 사용자 데이터가 없다. 기기의 일기는 앱 안 「일기 모두 지우기」나 앱 삭제로 지운다. 문의 메일(Gmail 보관)은 마지막 답장 뒤 30일 동안 이어지지 않으면 끝난 것으로 보고 휴지통까지 비워 지운다 | 방침 「보존과 삭제」·「문의」 | [코드] |
| 개인정보처리방침 URL | https://mrtint.github.io/alpharium/privacy/ | `src/app/policy-links.ts` | [코드] |

## App Store — 앱 개인정보 보호

정의([문서] developer.apple.com/app-store/app-privacy-details): 「수집」은 실시간 요청 처리에 필요한 시간보다 오래 개발자나 제3자 파트너가 접근할 수 있게 기기 밖으로 보내는 것이다.

| 질문 | 답 | 근거 | 표식 |
| --- | --- | --- | --- |
| 이 앱에서 데이터를 수집하나요? | Data Not Collected | ① 기기 안에서만 처리하는 데이터(사진·좌표·일기)는 수집이 아니다. ② 장소 이름의 좌표는 `CLGeocoder`로 Apple에 간다 — 「Apple이 모으는 데이터는 선언할 책임이 없다」. ③ 모듈 내려받기 때 Hugging Face가 받는 IP는 개발자가 보관하지 않는다 — 「서버 호출에 실린 IP가 보관되지 않으면 밝히지 않아도 된다」. Hugging Face는 앱에 코드를 넣은 파트너가 아니라 파일을 내주는 곳이다(Hugging Face가 자기 서버 기록을 얼마나 두는지는 확인하지 않았다) | [문서] |
| 추적(Tracking) | 아니요 | 광고 식별자·추적 SDK가 없다(테스트 F1) | [코드] |
| 개인정보 처리방침 URL | https://mrtint.github.io/alpharium/privacy/ | `src/app/policy-links.ts` | [코드] |
| 지원 URL | https://mrtint.github.io/alpharium/support/ | `src/app/policy-links.ts` | [코드] |

## 근거 출처

- Play Console 고객센터 — 데이터 보안 양식: https://support.google.com/googleplay/android-developer/answer/10787469
- Apple — App privacy details: https://developer.apple.com/app-store/app-privacy-details/
- Apple — `CLGeocoder`: https://developer.apple.com/documentation/corelocation/clgeocoder
- Android — `Geocoder`: https://developer.android.com/reference/android/location/Geocoder
- 설계와 소스 확인: `docs/superpowers/specs/2026-10-15-privacy-policy-design.md` §1
