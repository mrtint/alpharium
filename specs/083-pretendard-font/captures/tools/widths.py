"""083 — 같은 문자열 셋의 잉크 폭(단위 = px/3)을 잰다 (SC-002, 제품 밖 도구).

  python3 -I widths.py <pillow 경로> <캡처 폴더>

문자열: 설정 「장소 이름으로 보기」 행 라벨 · 설정 「쓰는 모듈」 값 「2.0GB」 · 쓴 날 홈 상태 줄 「오늘의 하루」.
(쓴 날 본문 첫 줄은 화면 폭이 달라 두 플랫폼에서 줄이 다른 자리에서 갈려 같은 문자열이 아니다 — 상태 줄로 대신한다.)
"""

import importlib.util
import sys

spec = importlib.util.spec_from_file_location("m", __file__.replace("widths.py", "measure.py"))
sys.argv = [sys.argv[0], sys.argv[1], "lib", *sys.argv[2:]]
m = importlib.util.module_from_spec(spec)
_main = None
src = open(spec.origin, encoding="utf-8").read().replace("\nmain()\n", "\n")
exec(compile(src, spec.origin, "exec"), m.__dict__)

folder = sys.argv[3]
U = m.UNIT
margin = 20 * U

st = m.load(f"{folder}/shot-04-settings-top.png")
w, h = st.size
seps = m.runs(m.dark_lines(st, margin, w - margin, 0, h, dark=200, share=0.95))
# seps[0] = 큰 제목 아래 굵은 선, 그 뒤가 행 구분선: 이름·자동으로 쓰기·장소 이름으로 보기·사진·위치·알림·배터리·쓰는 모듈 …
rows = seps[1:]
place = m.ink_bbox(st, (margin, rows[1][1] + 2, w // 2 + 40 * U, rows[2][0] - 2))
module_value = m.ink_bbox(st, (w // 2, rows[6][1] + 2, w - margin, rows[7][0] - 2))

home = m.load(f"{folder}/shot-01-home-written.png")
strip_top = m.runs(m.dark_lines(home, margin, w - margin, 0, h // 3))[0][0]
# 큰 숫자 잉크의 오른쪽 끝 + 8단위부터 — 요일·상태 줄 묶음의 시작은 숫자 폭을 따라 플랫폼마다 다르다
number = m.ink_bbox(home, (margin, strip_top - 80 * U, margin + 85 * U, strip_top - 1))
col = (number[2] + 8 * U, 0, w - margin - 40 * U, strip_top - 1)
blocks = m.ink_row_blocks(home, col)
state_line = m.ink_bbox(home, (col[0], blocks[-1][0], col[2], blocks[-1][1]))

for name, b in [("장소 이름으로 보기", place), ("2.0GB", module_value), ("오늘의 하루", state_line)]:
    print(name, {"width": m.u(b[2] - b[0]), "height": m.u(b[3] - b[1])})
