import sys, os
sys.path.insert(0, sys.argv[1])
from PIL import Image, ImageDraw
a_dir, i_dir, out_dir = sys.argv[2:5]
os.makedirs(out_dir, exist_ok=True)
# scale both to the same dp width: android 1080px / 360dp = 3.0 ; iOS 1206px / 402pt = 3.0
for name in sorted(os.listdir(a_dir)):
    if not name.endswith(".png") or not os.path.exists(os.path.join(i_dir, name)): continue
    a = Image.open(os.path.join(a_dir, name)).convert("RGB")
    i = Image.open(os.path.join(i_dir, name)).convert("RGB")
    h = max(a.height, i.height)
    c = Image.new("RGB", (a.width + i.width + 40, h + 60), "white")
    c.paste(a, (0, 60)); c.paste(i, (a.width + 40, 60))
    d = ImageDraw.Draw(c); d.text((10, 10), "Android SM-S901N (1080px=360dp)", fill="black"); d.text((a.width + 50, 10), "iOS sim iPhone 17 (1206px=402pt)", fill="black")
    c = c.resize((c.width // 2, c.height // 2))
    c.save(os.path.join(out_dir, name))
    print(name, a.size, i.size)
