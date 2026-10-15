"""083 — 캡처에서 글자 잉크를 잰다 (제품 밖 도구, 원칙 IV — 모델 출력이 아니라 화면 모양을 잰다).

두 기기 모두 3px = 1단위(안드로이드 1080px = 360dp, iOS 1206px = 402pt)라 px/3 이 dp·pt 다.

사용:
  python3 -I measure.py <pillow 경로> refs <캡처 폴더> <android|ios>
      기준 행 셋(research R6)의 위·아래 여백(단위)을 찍는다 — 쓴 날 홈 큰 날짜 숫자 · 설정 「이름」 행 라벨 · 하단 바 「다시 쓰기」.
  python3 -I measure.py <pillow 경로> width <png> <x0> <y0> <x1> <y1>
      사각 영역(px) 안 글자 잉크의 폭·높이(단위).

판정 문턱(밝기 차 60)과 「선」의 정의(행 폭의 85% 이상이 어두움)는 사람이 정한 값이다.
"""

import sys

sys.path.insert(0, sys.argv[1])
from PIL import Image  # noqa: E402

UNIT = 3
INK_DELTA = 60


def load(path):
    return Image.open(path).convert("L")


def bg_of(im, box):
    """영역의 배경 밝기 = 가장 흔한 값."""
    hist = im.crop(box).histogram()
    return max(range(256), key=lambda v: hist[v])


def ink_bbox(im, box, bg=None):
    """영역 안에서 배경과 INK_DELTA 넘게 다른 픽셀의 상자(전역 좌표). 없으면 None."""
    bg = bg_of(im, box) if bg is None else bg
    x0, y0, x1, y1 = box
    px = im.load()
    top = bottom = left = right = None
    for y in range(y0, y1):
        for x in range(x0, x1):
            if abs(px[x, y] - bg) > INK_DELTA:
                top = y if top is None else top
                bottom = y
                left = x if left is None or x < left else left
                right = x if right is None or x > right else right
    if top is None:
        return None
    return (left, top, right + 1, bottom + 1)


def dark_lines(im, x0, x1, y0, y1, dark=110, share=0.85):
    """x0..x1 의 85% 이상이 어두운 가로줄(y 목록)."""
    px = im.load()
    rows = []
    for y in range(y0, y1):
        n = sum(1 for x in range(x0, x1) if px[x, y] < dark)
        if n >= share * (x1 - x0):
            rows.append(y)
    return rows


def runs(ys):
    """연속한 y 를 (시작, 끝+1) 묶음으로."""
    out = []
    for y in ys:
        if out and y == out[-1][1]:
            out[-1][1] = y + 1
        else:
            out.append([y, y + 1])
    return [tuple(r) for r in out]


def u(v):
    return round(v / UNIT, 1)


def refs(folder, platform):
    margin = 20 * UNIT  # 지면 좌우 여백 20
    home = load(f"{folder}/shot-01-home-written.png")
    w, h = home.size
    out = {}

    # 1) 큰 날짜 숫자: 월 라벨 잉크 아래 ~ 스트립 위 굵은 선. 둘 사이에서 숫자 잉크(왼쪽 160단위 안)
    strip = runs(dark_lines(home, margin, w - margin, 0, h // 3))
    strip_top = strip[0][0]
    month = ink_bbox(home, (margin, 0, w // 2, strip_top - 1))
    # 월 라벨은 위에서 첫 잉크 덩어리 — 상태 표시줄을 피하려 위에서부터 줄 단위로 덩어리를 가른다
    # 숫자만 — 오른쪽의 요일·상태 줄(지면 왼쪽에서 약 112단위부터)이 섞이지 않게 85단위 폭으로 자른다
    col = (margin, 0, margin + 85 * UNIT, strip_top - 1)
    blocks = ink_row_blocks(home, col)
    month_block, number_block = blocks[-2], blocks[-1]
    out["date_number"] = {
        "gap_above(월 라벨 잉크 아래→숫자 잉크 위)": u(number_block[0] - month_block[1]),
        "gap_below(숫자 잉크 아래→스트립 선)": u(strip_top - number_block[1]),
        "ink_height": u(number_block[1] - number_block[0]),
    }

    # 2) 설정 「이름」 행: 「캐릭터」 머리 잉크 아래 ~ 그 행의 아래 구분선
    st = load(f"{folder}/shot-04-settings-top.png")
    lines = runs(dark_lines(st, margin, w - margin, 0, h, dark=200, share=0.95))
    # 첫 굵은 선 = 큰 제목 아래 선, 그 다음 선 = 「이름」 행 아래 구분선
    title_line, name_line = lines[0], lines[1]
    blocks = ink_row_blocks(st, (margin, title_line[1] + 1, margin + 120 * UNIT, name_line[0]))
    head_block, label_block = blocks[0], blocks[-1]
    out["name_row_label"] = {
        "gap_above(「캐릭터」 잉크 아래→「이름」 잉크 위)": u(label_block[0] - head_block[1]),
        "gap_below(「이름」 잉크 아래→구분선)": u(name_line[0] - label_block[1]),
        "ink_height": u(label_block[1] - label_block[0]),
    }

    # 3) 하단 바 「다시 쓰기」: 바 위 경계(지면색 → 바 색) ~ 「다시 쓰기」 잉크 위, 「다시 쓰기」 잉크 아래 ~ 보조 줄 잉크 위
    px = home.load()
    # 바 몸통 = 지면색과 다른 색이 30줄 넘게 이어지는 첫 자리(바 위 가장자리의 얇은 선·그림자는 건너뛴다)
    x = margin // 2  # 지면 왼쪽 여백 — 사진·글자가 닿지 않는 세로줄
    paper = px[x, int(h * 0.6)]
    ys = range(int(h * 0.6), h - 30)
    bar_top = next(y for y in ys if all(abs(px[x, y + k] - paper) > 4 for k in range(30)))
    blocks = ink_row_blocks(home, (margin, bar_top + 1, w - margin, min(h, bar_top + 70 * UNIT)))
    # 바 위 가장자리의 가는 선(4px 이하)은 글자가 아니다
    blocks = [b for b in blocks if b[1] - b[0] > 4]
    title_block, sub_block = blocks[0], blocks[1]
    out["bar_rewrite"] = {
        "gap_above(바 위 경계→「다시 쓰기」 잉크 위)": u(title_block[0] - bar_top),
        "gap_between(「다시 쓰기」 잉크 아래→보조 줄 잉크 위)": u(sub_block[0] - title_block[1]),
        "ink_height": u(title_block[1] - title_block[0]),
    }
    return out


def ink_row_blocks(im, box, gap=2 * UNIT):
    """영역을 가로로 훑어 잉크가 있는 줄 덩어리 (y0, y1) 목록 — gap 단위보다 가까우면 한 덩어리."""
    bg = bg_of(im, box)
    x0, y0, x1, y1 = box
    px = im.load()
    ys = [y for y in range(y0, y1) if any(abs(px[x, y] - bg) > INK_DELTA for x in range(x0, x1))]
    blocks = []
    for y in ys:
        if blocks and y - blocks[-1][1] <= gap:
            blocks[-1][1] = y + 1
        else:
            blocks.append([y, y + 1])
    return [tuple(b) for b in blocks]


def main():
    mode = sys.argv[2]
    if mode == "refs":
        for key, vals in refs(sys.argv[3], sys.argv[4]).items():
            print(key, vals)
    elif mode == "width":
        im = load(sys.argv[3])
        box = tuple(int(v) for v in sys.argv[4:8])
        b = ink_bbox(im, box)
        print("ink", None if b is None else {"width": u(b[2] - b[0]), "height": u(b[3] - b[1]), "box": b})


main()
