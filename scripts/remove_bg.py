"""Remove the pure-white background from the mascot illustrations.

We can't just threshold on luminance because skin highlights and the white
drawstrings are bright too. Instead we test for pixels that are BOTH bright
AND near-gray (low chroma). Those are the only pixels that actually belong to
the paper background. A soft transition at the edge preserves the anti-aliased
ink line.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


# Tuning knobs
BRIGHT_HARD = 253   # min(r,g,b) at/above this => pure paper, fully transparent
BRIGHT_SOFT = 240   # fade alpha in this band
CHROMA_MAX = 10     # max(r,g,b) - min(r,g,b) above this => colored, keep opaque


def remove_white(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGBA")
    px = img.load()
    w, h = img.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            mn = min(r, g, b)
            chroma = max(r, g, b) - mn

            if chroma > CHROMA_MAX:
                continue  # saturated color -> keep as-is

            if mn >= BRIGHT_HARD:
                px[x, y] = (r, g, b, 0)
            elif mn >= BRIGHT_SOFT:
                t = (mn - BRIGHT_SOFT) / (BRIGHT_HARD - BRIGHT_SOFT)
                alpha = int(round(a * (1.0 - t)))
                px[x, y] = (r, g, b, alpha)

    # Intentionally DON'T auto-crop: keeping all poses at the same
    # canvas dimensions means the character stays registered in the
    # same pixel-space across poses, so the cross-fade is seamless.
    img.save(dst, "PNG", optimize=True)


def main() -> int:
    here = Path(__file__).resolve().parent.parent
    src_dir = here / "assets"
    out_dir = here / "assets"

    names = [
        "mascot-base-happy",
        "mascot-excited",
        "mascot-thinking",
        "mascot-teaching",
        "mascot-worried",
    ]

    for name in names:
        src = src_dir / f"{name}.png"
        dst = out_dir / f"{name}-transparent.png"
        if not src.exists():
            print(f"skip: {src} missing")
            continue
        remove_white(src, dst)
        print(f"wrote {dst.name}  ({dst.stat().st_size // 1024} KB)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
