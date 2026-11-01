#!/usr/bin/env bash
# PostToolUse(Write|Edit) 훅: 사람이 읽는 문서(md·html)를 쓰면 humanizer 보정 안내를 넣는다.
# 정본: bluehall .claude/hooks/humanize-reminder.sh (파생 저장소에는 그대로 복사한다)
# 설계: bluehall docs/superpowers/specs/2026-10-29-doc-humanize-and-eli-design.md
# 어떤 경우에도 도구 실행을 막지 않도록 항상 exit 0 으로 끝낸다.

command -v jq >/dev/null 2>&1 || exit 0
input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)" || exit 0
session="$(printf '%s' "$input" | jq -r '.session_id // "unknown"' 2>/dev/null)" || exit 0
[ -n "$file" ] || exit 0

case "$file" in
  *.md|*.html|*.htm) ;;
  *) exit 0 ;;
esac

# 어디서든 제외: Claude 설정·메모리(/.claude/), eval 산출물(<스킬>-workspace/ 폴더).
# scratchpad 경로의 "-Users-…-workspace" 처럼 '-' 로 시작하는 세그먼트는 eval 폴더가 아니다.
case "$file" in
  */.claude/*) exit 0 ;;
esac
IFS=/ read -r -a segs <<<"$file"
for seg in "${segs[@]}"; do
  case "$seg" in
    -*) ;;
    *-workspace) exit 0 ;;
  esac
done

# 저장소용 제외 규칙은 프로젝트 안 경로에만 적용한다
proj="${CLAUDE_PROJECT_DIR:-}"
if [ -n "$proj" ] && [ "${file#"$proj"/}" != "$file" ]; then
  rel="${file#"$proj"/}"
  case "/$rel" in
    */specs/*|*/docs/superpowers/*|*/docs/concepts/*|*/.gemini/*|*/optional/*) exit 0 ;;
    # 파생 저장소 배치: 스킬·메모리(.agents/ .ai/ skills/ memory/), speckit 템플릿, superpowers 작업 기록
    */.agents/*|*/.ai/*|*/skills/*|*/memory/*|*/.specify/*|*/.superpowers/*) exit 0 ;;
  esac
  case "$(basename "$file")" in
    CLAUDE.md|GEMINI.md|AGENTS.md|SOUL.md|USER.md) exit 0 ;;
  esac
  case "$rel" in
    docs/ROADMAP.md|docs/skill-eval-protocol.md|docs/derivatives.md) exit 0 ;;
  esac
fi

# 같은 세션에서 같은 문서에는 한 번만 안내한다 (보정 자체가 Edit 을 일으켜 루프가 생기는 것을 막는다)
seen="${TMPDIR:-/tmp}/humanize-reminder-${session}"
if [ -f "$seen" ] && grep -Fxq -- "$file" "$seen"; then
  exit 0
fi
# 기록을 못 남기면 다음 Edit 에서 또 안내하게 되므로, 이때는 안내하지 않는다
{ printf '%s\n' "$file" >>"$seen"; } 2>/dev/null || exit 0

msg="${file}는 사람이 읽는 문서라 humanizer 스킬의 보정 대상이다. 보정할 때 수치·날짜·식별자·코드·경로·링크는 바꾸지 않는다. Edit로 일부만 바꿨다면 바뀐 부분만 다듬는다."
case "$file" in
  # eval 에서 humanizer 가 아이콘 div·배너 이모지를 지워 레이아웃을 깨뜨린 일이 있었다
  *.html|*.htm) msg="$msg html 문서는 글자만 다듬고, 태그·요소·아이콘은 지우지 않는다(디자인 요소인 이모지 포함)." ;;
esac
jq -n --arg m "$msg" '{hookSpecificOutput:{hookEventName:"PostToolUse", additionalContext:$m}}'
exit 0
