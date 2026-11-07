"""Генерирует 5 анимированных GIF-фонов (bg.gif, bg1.gif ... bg4.gif) в папке backgrounds/.
Нужен только Pillow:  pip install pillow
Потом можешь заменить любой фон своим bg.mp4 / bg1.mp4 ... (mp4 приоритетнее gif)."""
import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageOps

OUT = Path(__file__).parent / "backgrounds"
OUT.mkdir(exist_ok=True)
W, H, N = 480, 270, 40

# (имя файла, цвет1, цвет2, цвет3 (середина), цвет сердечек)
PALETTES = [
    ("bg",  "#3a1a4a", "#ff8fc7", "#a64dff", "#ffd6ec"),
    ("bg1", "#0f0a2a", "#6a4cff", "#b79cff", "#e6dcff"),
    ("bg2", "#06302f", "#5fe0c0", "#2a8f9f", "#dffff7"),
    ("bg3", "#07021a", "#c040ff", "#3d7bff", "#f0c8ff"),
    ("bg4", "#3a1030", "#ff9a8b", "#ffb347", "#fff0d6"),
]


def heart(draw, cx, cy, s, fill):
    pts = []
    for i in range(0, 63):
        t = i / 10
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * s, cy - y * s))
    draw.polygon(pts, fill=fill)


def sparkle(draw, cx, cy, r, fill):
    draw.polygon([(cx, cy - r), (cx + r * .25, cy - r * .25), (cx + r, cy), (cx + r * .25, cy + r * .25),
                  (cx, cy + r), (cx - r * .25, cy + r * .25), (cx - r, cy), (cx - r * .25, cy - r * .25)], fill=fill)


def make(name, c1, c2, c3, cheart):
    rnd = random.Random(name)
    g = Image.linear_gradient("L").resize((W, H // 2))
    full = Image.new("L", (W, H))
    full.paste(g, (0, 0))
    full.paste(ImageOps.flip(g), (0, H // 2))
    hearts = [(rnd.randint(0, W), rnd.uniform(.35, 1.0), rnd.choice([1, 1, 2]), rnd.randint(1, 3), rnd.uniform(0, 6.28)) for _ in range(16)]
    stars = [(rnd.randint(0, W), rnd.randint(0, H), rnd.randint(4, 9), rnd.uniform(0, 6.28)) for _ in range(22)]
    frames = []
    for f in range(N):
        base = ImageChops.offset(full, 0, int(f * H / N))
        img = ImageOps.colorize(base, c1, c2, mid=c3).convert("RGBA")
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        col = Image.new("RGB", (1, 1), cheart).getpixel((0, 0))
        for x0, sc, k, m, ph in hearts:
            y = (H + 40) - ((f / N) * k * (H + 40) + x0 * 2) % (H + 40) - 20
            x = x0 + 10 * math.sin(2 * math.pi * m * f / N + ph)
            heart(d, x, y, sc * 1.1, col + (int(120 * sc + 40),))
        for sx, sy, r, ph in stars:
            a = int(60 + 190 * (0.5 + 0.5 * math.sin(2 * math.pi * f / N + ph)))
            sparkle(d, sx, sy, r, col + (a,))
        img = Image.alpha_composite(img, ov).convert("RGB")
        frames.append(img.convert("P", palette=Image.Palette.ADAPTIVE, colors=128))
    frames[0].save(OUT / f"{name}.gif", save_all=True, append_images=frames[1:], duration=60, loop=0, disposal=2)
    print("ok:", OUT / f"{name}.gif")


if __name__ == "__main__":
    for p in PALETTES:
        make(*p)
