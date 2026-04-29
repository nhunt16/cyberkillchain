"""Overlay design-critique annotations onto page screenshots.

The pipeline expects raw PNG screenshots in design/raw/<page>.png and a
sibling JSON manifest at design/annotations/<page>.json describing the
regions to highlight. It writes annotated PNGs to design/annotated/.

Each region has shape:

    {
      "x": int, "y": int, "w": int, "h": int,
      "kind": "nav" | "hero" | "cta" | "content" | "support" | "meta" | "accent",
      "label": "short tag (uppercase)",
      "title": "longer headline that fits inside the rect",
      "note": "one-sentence design rationale"
    }

The script keys colors off `kind` so the legend stays consistent across
every page.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "design" / "raw"
OUT_DIR = ROOT / "design" / "annotated"
ANN_DIR = ROOT / "design" / "annotations"

# Color palette — chosen so each "design role" reads at a glance even
# against the site's mostly-black backgrounds.
PALETTE: Dict[str, Tuple[int, int, int]] = {
    "nav":     (96, 165, 250),    # sky blue
    "hero":    (236, 72,  153),   # hot pink
    "cta":     (167, 139, 250),   # accent purple
    "content": (52,  211, 153),   # emerald
    "support": (251, 191, 36),    # amber
    "meta":    (156, 163, 175),   # neutral grey
    "accent":  (244, 114, 182),   # bright pink alt
}

KIND_LABELS: Dict[str, str] = {
    "nav":     "NAVIGATION",
    "hero":    "HERO / TITLE",
    "cta":     "PRIMARY CTA",
    "content": "CONTENT GROUP",
    "support": "SUPPORTING",
    "meta":    "META",
    "accent":  "ACCENT",
}


def _font(size: int, weight: str = "regular") -> ImageFont.FreeTypeFont:
    """Try a few system fonts so the script works on macOS without
    needing a custom typeface check-in. Falls back to PIL's default."""
    candidates = [
        ("/System/Library/Fonts/HelveticaNeue.ttc", 0),
        ("/System/Library/Fonts/Helvetica.ttc", 0),
        ("/Library/Fonts/Arial.ttf", 0),
        ("/System/Library/Fonts/SFNS.ttf", 0),
    ]
    if weight == "bold":
        candidates = [
            ("/System/Library/Fonts/HelveticaNeue.ttc", 1),
            ("/System/Library/Fonts/Helvetica.ttc", 1),
            ("/Library/Fonts/Arial Bold.ttf", 0),
        ] + candidates
    for path, idx in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size, index=idx)
            except OSError:
                continue
    return ImageFont.load_default()


def _measure(draw: ImageDraw.ImageDraw, text: str, font) -> Tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def annotate(page: str) -> Path:
    src_path = RAW_DIR / f"{page}.png"
    ann_path = ANN_DIR / f"{page}.json"
    out_path = OUT_DIR / f"{page}.png"

    if not src_path.exists():
        raise SystemExit(f"missing screenshot: {src_path}")
    if not ann_path.exists():
        raise SystemExit(f"missing annotations: {ann_path}")

    screenshot = Image.open(src_path).convert("RGBA")
    SW, SH = screenshot.size

    # The page-title banner and legend live ABOVE/BELOW the original
    # screenshot, in extended canvas padding, so they never obscure
    # actual UI being annotated.
    spec_pre = json.loads(ann_path.read_text())
    has_subtitle = bool(spec_pre.get("subtitle"))
    top_pad = 130 if has_subtitle else 90
    bot_pad = 95 if spec_pre.get("legend") else 0

    W, H = SW, SH + top_pad + bot_pad
    base = Image.new("RGBA", (W, H), (8, 10, 18, 255))
    base.paste(screenshot, (0, top_pad))

    # ----- Stage 1: translucent group fills + 4-px borders -----
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)

    spec = spec_pre
    regions = spec.get("regions", [])
    legend  = spec.get("legend", [])
    title   = spec.get("title", page)
    subtitle = spec.get("subtitle", "")

    def shift(r):
        # Region coords in JSON are relative to the original screenshot;
        # shift them by top_pad before drawing onto the extended canvas.
        return r["x"], r["y"] + top_pad, r["w"], r["h"]

    for r in regions:
        kind = r.get("kind", "content")
        col = PALETTE.get(kind, PALETTE["content"])
        x, y, w, h = shift(r)
        # translucent fill
        od.rectangle([x, y, x + w, y + h], fill=col + (38,))
        # solid border
        for off in range(4):
            od.rectangle(
                [x - off, y - off, x + w + off, y + h + off],
                outline=col + (255,),
            )

    base.alpha_composite(overlay)

    # ----- Stage 2: per-region tag + title + note (drawn opaque) -----
    draw = ImageDraw.Draw(base)
    f_tag      = _font(22, "bold")
    f_note     = _font(20, "regular")
    f_legend_h = _font(22, "bold")
    f_h        = _font(54, "bold")
    f_sub      = _font(22, "regular")

    for r in regions:
        kind = r.get("kind", "content")
        col = PALETTE.get(kind, PALETTE["content"])
        x, y, w, h = shift(r)

        # KIND tag pill in top-left of the rect. The tag is the ONLY
        # in-rect label — the verbose caption goes in the `note` callout
        # so we don't pile multiple labels on top of the screenshot.
        kind_text = r.get("label") or KIND_LABELS.get(kind, kind.upper())
        tw, th = _measure(draw, kind_text, f_tag)
        pad = 8
        # Allow per-region tag placement so we can move the pill to the
        # top-right when the top-left collides with screenshot content.
        tag_pos = r.get("tag_pos", "top-left")
        if tag_pos == "top-right":
            tag_x = x + w - tw - 2 * pad - 8
        else:
            tag_x = x + 8
        tag_y = y + 8
        draw.rectangle(
            [tag_x, tag_y, tag_x + tw + 2 * pad, tag_y + th + 2 * pad],
            fill=col + (255,),
        )
        draw.text((tag_x + pad, tag_y + pad - 2), kind_text, font=f_tag, fill=(15, 15, 20, 255))

        # Note: small caption near the rect. By default it's anchored
        # at the bottom-left INSIDE the rect, but `note_anchor` lets the
        # JSON spec place it outside (below / above / right) when the
        # group box is too short or the inside is busy.
        note_text = r.get("note", "")
        if note_text:
            chunks: List[str] = []
            words = note_text.split()
            line = ""
            limit = r.get("note_chars", 72)
            for word in words:
                trial = (line + " " + word).strip()
                if len(trial) > limit:
                    chunks.append(line)
                    line = word
                else:
                    line = trial
            if line:
                chunks.append(line)

            line_h = _measure(draw, "Mg", f_note)[1] + 6
            total_h = line_h * len(chunks) + 16
            max_w = max(_measure(draw, c, f_note)[0] for c in chunks) + 24

            anchor = r.get("note_anchor", "in")
            if anchor == "below":
                nx, ny = x + 8, y + h + 10
            elif anchor == "above":
                nx, ny = x + 8, y - total_h - 10
            elif anchor == "right":
                nx, ny = x + w + 14, y + 8
            elif anchor == "below-right":
                nx, ny = x + w - max_w - 8, y + h + 10
            else:  # "in" — bottom-left inside
                nx, ny = x + 8, y + h - total_h - 8

            draw.rectangle(
                [nx, ny, nx + max_w, ny + total_h],
                fill=(12, 14, 22, 230),
                outline=col + (255,),
                width=2,
            )
            for i, c in enumerate(chunks):
                draw.text(
                    (nx + 12, ny + 8 + i * line_h),
                    c,
                    font=f_note,
                    fill=(232, 232, 240, 255),
                )

    # ----- Stage 3: page title banner in the TOP padding zone -----
    if title:
        bd = ImageDraw.Draw(base)
        bd.text((28, 18), title, font=f_h, fill=(255, 255, 255, 255))
        if subtitle:
            bd.text((30, 82), subtitle, font=f_sub, fill=(176, 184, 200, 255))
        # subtle separator line between banner and screenshot
        bd.line([(0, top_pad - 1), (W, top_pad - 1)], fill=(60, 70, 90, 255), width=1)

    # ----- Stage 4: legend strip in the BOTTOM padding zone -----
    if legend and bot_pad:
        ld = ImageDraw.Draw(base)
        # subtle separator line above legend
        ld.line(
            [(0, top_pad + SH), (W, top_pad + SH)],
            fill=(60, 70, 90, 255), width=1,
        )
        legend_y = top_pad + SH
        cursor_x = 28
        for entry in legend:
            kind = entry["kind"]
            text = entry.get("label", KIND_LABELS.get(kind, kind.upper()))
            col = PALETTE.get(kind, PALETTE["content"])
            sw, sh = 22, 22
            sy = legend_y + (bot_pad - sh) // 2
            ld.rectangle([cursor_x, sy, cursor_x + sw, sy + sh], fill=col + (255,))
            ltx = cursor_x + sw + 10
            lty = legend_y + (bot_pad - 22) // 2
            ld.text((ltx, lty - 2), text, font=f_legend_h, fill=(255, 255, 255, 255))
            tw_, _ = _measure(ld, text, f_legend_h)
            cursor_x = ltx + tw_ + 32

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out_path, "PNG", optimize=True)
    return out_path


if __name__ == "__main__":
    pages = sys.argv[1:] or [p.stem for p in ANN_DIR.glob("*.json")]
    for page in pages:
        out = annotate(page)
        print(f"wrote {out}")
