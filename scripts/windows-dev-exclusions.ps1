<#
.SYNOPSIS
  개발자 기계(Windows)에서 lint·테스트가 느린 것을 고친다.

.DESCRIPTION
  이 저장소에서 `npm run lint`는 CI(우분투)에서 6초인데 Windows에서 11분 39초가
  걸렸다. 100배 넘는 격차이며, 원인은 코드도 저장소 설정도 아니다.

  **실측(2026-08-18, 이 기계):**

  | 대상                     | 시간        |
  | ------------------------ | ----------- |
  | node_modules 2000개 읽기 | 70.7초      |
  |   → 파일당               | **35.37ms** |
  | 같은 2000개 다시 읽기    | 0.72초      |
  |   → 파일당               | **0.36ms**  |

  같은 파일을 두 번째로 읽으면 **98배 빨라진다.** 디스크 속도라면 이런 차이가 날 수
  없다. Defender 실시간 검사가 파일마다 처음 한 번 가로채고, 그 뒤로는 검사 결과를
  캐시하기 때문이다. node_modules에는 파일이 44,221개 있다.

  eslint가 파일 하나만 검사해도 6.3초가 걸리는 것이 같은 원인이다 —
  eslint-config-expo의 의존성 트리를 해석하며 수천 개 파일을 여는데, 그 하나하나가
  검사를 거친다.

  **이 스크립트는 개발자 기계의 설정만 바꾼다.** 저장소에는 아무 영향이 없고, 다른
  사람이 돌리지 않아도 CI는 그대로 돈다. 무엇을 왜 제외하는지 모르는 채로 돌리지
  않도록 아래에 근거를 적어 둔다.

.NOTES
  ⚠️ **관리자 권한이 필요하다.** PowerShell을 「관리자 권한으로 실행」으로 연다.

  **관리자 창은 C:\WINDOWS\system32에서 열린다.** 저장소가 아니므로 `.\scripts\...`
  같은 상대 경로는 「용어가 인식되지 않습니다」로 실패한다. 절대 경로로 부른다:

      Set-ExecutionPolicy -Scope Process Bypass -Force
      & "C:\Users\mrtin\Workspace\alpharium\scripts\windows-dev-exclusions.ps1"

  되돌리려면 -Remove를 붙인다:

      & "C:\Users\mrtin\Workspace\alpharium\scripts\windows-dev-exclusions.ps1" -Remove

  저장소로 옮긴 뒤 상대 경로로 불러도 된다:

      Set-Location C:\Users\mrtin\Workspace\alpharium
      .\scripts\windows-dev-exclusions.ps1

  **보안상의 판단이 필요하다.** 제외한 경로는 실시간 검사를 받지 않는다. 여기서
  제외하는 것은 (1) 이 저장소, (2) npm 캐시, (3) Node/개발 도구 실행 파일이다.
  npm 의존성은 신뢰할 수 없는 코드가 들어올 수 있는 통로이므로, 이 절충을 받아들일지는
  기계 주인이 정한다. 받아들이지 않는다면 이 스크립트를 돌리지 않으면 되고, 그 경우
  lint가 느린 것은 그대로 남는다.

  ⚠️ **이 파일은 BOM이 있어야 한다.** Windows PowerShell 5.1은 BOM이 없는
  UTF-8을 CP949로 읽어 한글이 전부 깨진다. AGENTS.md가 Maestro에서 적어 둔
  것과 같은 계열이다 — 고치면서 BOM을 떼면 안된다.
#>

[CmdletBinding()]
param(
  # 제외를 걸지 않고 되돌린다.
  [switch]$Remove
)

$ErrorActionPreference = "Stop"

# 관리자 권한 확인. 없으면 Add-MpPreference가 조용히 실패하는 대신 여기서 멈춘다.
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "관리자 권한이 필요하다. PowerShell을 「관리자 권한으로 실행」으로 다시 연다."
  exit 1
}

# 저장소 루트 — 이 스크립트의 부모의 부모다.
$repo = Split-Path -Parent $PSScriptRoot

# 제외할 경로.
$paths = @(
  $repo                              # 저장소 전체 (node_modules 44,221개가 여기 있다)
  "$env:APPDATA\npm-cache"           # npm 캐시 — npm ci가 여기서 푼다
  "$env:LOCALAPPDATA\npm-cache"
)

# 제외할 프로세스. 경로 제외만으로는 도구가 다른 곳을 읽을 때가 남는다.
$processes = @(
  "node.exe"
  "npm.cmd"
)

$existingPaths = @($paths | Where-Object { Test-Path $_ })

if ($Remove) {
  Write-Output "제외를 되돌린다..."
  foreach ($p in $existingPaths) {
    Remove-MpPreference -ExclusionPath $p -ErrorAction SilentlyContinue
    Write-Output "  제거: $p"
  }
  foreach ($proc in $processes) {
    Remove-MpPreference -ExclusionProcess $proc -ErrorAction SilentlyContinue
    Write-Output "  제거: $proc"
  }
  Write-Output ""
  Write-Output "되돌렸다. 실시간 검사가 다시 이 경로들을 본다."
  exit 0
}

Write-Output "Defender 실시간 검사에서 제외한다..."
Write-Output ""

foreach ($p in $existingPaths) {
  Add-MpPreference -ExclusionPath $p
  Write-Output "  경로: $p"
}

foreach ($proc in $processes) {
  Add-MpPreference -ExclusionProcess $proc
  Write-Output "  프로세스: $proc"
}

Write-Output ""
Write-Output "끝났다. 확인하려면:"
Write-Output ""
Write-Output "    npm run lint"
Write-Output ""
Write-Output "제외 전 이 기계에서 11분 39초였다. 되돌리려면 -Remove를 붙여 다시 돌린다."
