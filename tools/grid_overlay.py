"""Overlay a 100-pixel coordinate grid on raw screenshots so I can read
exact pixel positions when authoring annotation rectangles."""

import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent


def grid(page: str) -> Path:
    src = ROOT / "design" / "raw" / f"{page}.png"
    out = ROOT / "design" / "raw" / f"{page}-grid.png"
    img = Image.open(src).convert("RGBA")
    W, H = img.size
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18)
    except OSError:
        font = ImageFont.load_default()

    # 100-px gridlines
    for x in range(0, W, 100):
        d.line([(x, 0), (x, H)], fill=(255, 255, 255, 60), width=1)
        d.text((x + 4, 4), str(x), fill=(120, 220, 255, 220), font=font)
    for y in range(0, H, 100):
        d.line([(0, y), (W, y)], fill=(255, 255, 255, 60), width=1)
        d.text((4, y + 4), str(y), fill=(120, 220, 255, 220), font=font)

    # 200-px brighter lines for easier counting
    for x in range(0, W, 200):
        d.line([(x, 0), (x, H)], fill=(255, 255, 255, 110), width=1)
    for y in range(0, H, 200):
        d.line([(0, y), (W, y)], fill=(255, 255, 255, 110), width=1)

    img.alpha_composite(overlay)
    img.convert("RGB").save(out, "PNG", optimize=True)
    return out


if __name__ == "__main__":
    pages = sys.argv[1:] or [p.stem for p in (ROOT / "design" / "raw").glob("*.png") if "-grid" not in p.stem]
    for p in pages:
        print(grid(p))
