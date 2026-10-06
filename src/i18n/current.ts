/**
 * 지금 프로세스의 화면 언어와 카탈로그 (062).
 *
 * 계약: specs/062-ui-text-i18n/contracts/i18n.md C1~C5, spec FR-010·FR-011, Clarification Q1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **프로세스마다 한 번 정한다**(C1, FR-011) — 첫 호출에서 기기 언어를 읽어 해석하고 그 결과를 들고 있다. 전경 복귀·`AppState`를 보지
 * 않는다(C3). 기기 언어가 바뀌면 안드로이드가 프로세스를 다시 띄우는 경로로만 반영된다(Clarification Q1).
 *
 * **React 컨텍스트가 아니라 모듈 함수다** — 헤드리스 백그라운드 태스크(완성 알림)도 같은 함수로 같은 해석을 탄다(FR-010, C5).
 *
 * **`text()`는 언제나 같은 객체를 돌려준다**(C2) — 렌더마다 새 객체면 그것을 의존성으로 쓰는 effect가 다시 돈다(055
 * `currentEnvironment()` 사고).
 *
 * **모듈 최상단에서 부르지 않는다**(C4) — 문구 모음을 모듈 상수로 두고 싶으면 `lazyText()`로 감싼다. 불러오는 순간 기기를 읽지 않게
 * 하고, 테스트가 감지 통로를 바꾼 뒤에 결정이 일어나게 한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CATALOGS, type Catalog } from "./catalogs";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from "./languages";
import { readDeviceLocales } from "./locale-port";
import { resolveLanguage, type LanguageResolution } from "./resolve";

let decided: { resolution: LanguageResolution<Language>; catalog: Catalog } | undefined;

function decide(): { resolution: LanguageResolution<Language>; catalog: Catalog } {
  if (decided === undefined) {
    const resolution = resolveLanguage(readDeviceLocales(), SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE);
    decided = { resolution, catalog: CATALOGS[resolution.chosen] };
  }
  return decided;
}

/** 지금 화면 언어의 카탈로그 */
export function text(): Catalog {
  return decide().catalog;
}

/** 감지한 것과 고른 것 — 진단 화면이 보인다(FR-011b) */
export function languageResolution(): LanguageResolution<Language> {
  return decide().resolution;
}

/**
 * 카탈로그의 한 부분을 **읽는 순간에** 꺼내는 객체(062).
 *
 * 원래 모듈 상수(`SETTINGS_TEXT` 등)로 쓰이던 문구 모음을 이름 그대로 두려고 쓴다 — 부르는 화면·테스트를 고치지 않고도 문구가
 * 카탈로그에서 온다(FR-004). 모듈을 불러올 때는 아무것도 읽지 않고, 속성을 읽을 때 `text()`를 부른다(C4).
 */
export function lazyText<T extends object>(pick: (catalog: Catalog) => T): T {
  return lazyOver({} as T, pick);
}

/** `lazyText()`의 배열판 — `Array.isArray`·`JSON.stringify`가 배열로 보게 빈 배열 위에 세운다 */
export function lazyList<T extends readonly unknown[]>(pick: (catalog: Catalog) => T): T {
  return lazyOver([] as unknown as T, pick);
}

function lazyOver<T extends object>(shell: T, pick: (catalog: Catalog) => T): T {
  const target = (): T => pick(text());
  return new Proxy(shell, {
    get: (_, key) => Reflect.get(target(), key),
    has: (_, key) => Reflect.has(target(), key),
    ownKeys: () => Reflect.ownKeys(target()),
    getOwnPropertyDescriptor: (_, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(target(), key);
      if (descriptor === undefined) return undefined;
      // 껍데기에 고칠 수 없는 속성(배열의 `length`)이 있으면 그대로 알려야 Proxy 불변식이 깨지지 않는다
      const own = Reflect.getOwnPropertyDescriptor(shell, key);
      return { ...descriptor, configurable: own === undefined ? true : own.configurable };
    },
  });
}
